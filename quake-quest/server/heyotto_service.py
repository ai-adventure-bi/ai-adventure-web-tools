"""In-memory session credentials and sealed, immutable investigator rounds."""
import secrets,time,threading,json,math,copy
from heyotto_analysis import IDS,PROMPT,prepare_data,validate,triangulate,number
from heyotto_provider import HeyOttoProvider,ProviderError

class ApiError(Exception):
    def __init__(self,message,status=422):super().__init__(message);self.status=status

class Investigator:
    def __init__(self,provider=None):
        self.provider=provider or HeyOttoProvider();self.sessions={};self.lock=threading.RLock();self.slots=threading.BoundedSemaphore(3)
    def session(self,token):
        with self.lock:
            now=time.monotonic()
            for t,s in list(self.sessions.items()):
                if now-s['used']>7200:self.sessions.pop(t,None);s['key']=None
            s=self.sessions.get(token)
            if s:s['used']=now
            return s
    def connect(self,key):
        if not isinstance(key,str) or not 8<=len(key)<=4096 or any(ord(c)<33 or ord(c)>126 for c in key):raise ApiError('Enter a valid personal API key.')
        if not self.slots.acquire(False):raise ApiError('HeyOtto is busy. Continue solo or try again shortly.',429)
        try:self.provider.authenticate(key)
        except ProviderError as e:raise ApiError(str(e),503) from None
        except Exception:raise ApiError('HeyOtto authentication failed. Continue solo or try again.',503) from None
        finally:self.slots.release()
        with self.lock:
            if len(self.sessions)>=100:raise ApiError('Too many active connections. Try again later.',429)
            token=secrets.token_urlsafe(32);self.sessions[token]={'key':key,'used':time.monotonic(),'rounds':{}}
        return token
    def disconnect(self,token):
        with self.lock:
            s=self.sessions.pop(token,None)
            if s:
                s['key']=None
                for r in s['rounds'].values():r['status']='unavailable';r['message']='HeyOtto disconnected.';r['prediction']=None
    def start(self,token,case,round_id,station_codes,selection,waveform):
        s=self.session(token)
        if not s:raise ApiError('Reconnect HeyOtto to investigate.',401)
        if not isinstance(round_id,str) or len(round_id)>80 or not isinstance(case,str) or len(case)>80:raise ApiError('Invalid round.')
        if not isinstance(station_codes,list) or len(station_codes)!=3 or len(set(station_codes))!=3 or any(not isinstance(x,str) for x in station_codes):raise ApiError('Exactly three stations are required.')
        with self.lock:
            if round_id in s['rounds']:
                r=s['rounds'][round_id]
                if r['case']!=case or r['codes']!=station_codes:raise ApiError('Round identity cannot change.')
                return self.public(r)
            if sum(r['status']=='investigating' for r in s['rounds'].values())>=2:raise ApiError('Previous investigations are still finishing. Continue solo or retry shortly.',429)
            while len(s['rounds'])>=12:
                old=next((k for k,v in s['rounds'].items() if v['status']!='investigating'),None)
                if old is None:raise ApiError('Too many active rounds.',429)
                del s['rounds'][old]
            r={'id':round_id,'case':case,'codes':station_codes,'status':'investigating','message':'HeyOtto is investigating…','started':time.monotonic(),'submission':None,'prediction':None,'revealed':False}
            s['rounds'][round_id]=r
        def run():
            if not self.slots.acquire(False):
                with self.lock:r.update(status='unavailable',message='HeyOtto is busy. Your investigation can continue.')
                return
            try:
                stations=selection(case)
                if [st['code'] for st in stations]!=station_codes:raise ValueError('The initial station selection changed. Try another round.')
                data,notes=prepare_data(case,stations,waveform)
                key=s['key']
                if not key:return
                correction=None
                for attempt in range(2):
                    with self.lock:
                        if r['status']!='investigating':return
                    raw=self.provider.analyse(key,PROMPT,data,correction)
                    if not isinstance(raw,str) or len(raw)>64000:raise ValueError('HeyOtto returned an oversized or unsupported response.')
                    try:phases=validate(raw,data);break
                    except (ValueError,TypeError,KeyError) as e:
                        if attempt:raise ValueError('HeyOtto returned invalid phase picks after a retry.') from None
                        correction='Your previous JSON failed validation: '+str(e)+'. Return the required JSON using only the same numerical DATA.'
                location=triangulate(stations,phases['stations'])
                mapping=[{'station_id':ident,'code':st['code']} for ident,st in zip(IDS,stations)]
                prediction={'phases':phases,'location':location,'mapping':mapping,'window':{'start':data['window_start_s'],'span':60},'limitations':notes}
                if location and location['ambiguous']:prediction['limitations'].append('Station geometry permits more than one similarly good location; this prediction is ambiguous.')
                if location is None:prediction['limitations'].append('Three resolved P/S pairs are required for a geographical prediction.')
                with self.lock:
                    if s['key'] and r['status']=='investigating' and time.monotonic()-r['started']<=240:r.update(status='ready',message='HeyOtto has made its prediction.',prediction=prediction)
            except ProviderError as e:
                with self.lock:
                    if r['status']=='investigating':r.update(status='unavailable',message=str(e))
            except Exception:
                # Do not log provider bodies, credentials, reference information or private predictions.
                with self.lock:
                    if r['status']=='investigating':r.update(status='unavailable',message='HeyOtto could not complete a valid analysis of these recordings. Your investigation can continue.')
            finally:self.slots.release()
        threading.Thread(target=run,daemon=True).start()
        return self.public(r)
    def get(self,token,rid):
        s=self.session(token)
        if not s or rid not in s['rounds']:raise ApiError('This HeyOtto round has expired. Continue without its result.',404)
        r=s['rounds'][rid]
        with self.lock:
            if r['status']=='investigating' and time.monotonic()-r['started']>240:r.update(status='unavailable',message='HeyOtto timed out. Your answer is unaffected.')
        return r
    def public(self,r):
        # Even a direct status request cannot retrieve a sealed prediction.
        return {'id':r['id'],'status':r['status'],'message':r['message'],'locked':r['submission'] is not None}
    def submit(self,token,rid,guess,picks,count):
        r=self.get(token,rid)
        if not isinstance(guess,dict) or set(guess)!={'lat','lon'} or not all(number(guess[k]) for k in guess) or not -90<=guess['lat']<=90 or not -180<=guess['lon']<=180:raise ApiError('Choose valid map coordinates.')
        if not isinstance(picks,dict) or len(picks)>6 or type(count) is not int or count not in range(3,7):raise ApiError('Invalid submitted recordings.')
        for code,p in picks.items():
            if not isinstance(code,str) or not isinstance(p,dict) or any(k not in ('p','s','a','b') or not number(v) or not 0<=v<=7200 for k,v in p.items()):raise ApiError('Invalid submitted picks.')
        submitted={'guess':guess,'picks':picks,'count':count}
        with self.lock:
            if r['submission'] is not None and r['submission']!=submitted:raise ApiError('Your answer is already locked.',409)
            if r['submission'] is None:r['submission']=copy.deepcopy(submitted);r['submitted_at']=time.monotonic()
        return self.public(r)
    def reveal(self,token,rid,skip=False):
        r=self.get(token,rid)
        with self.lock:
            if r['submission'] is None:raise ApiError('Lock your answer before comparing predictions.',409)
            if r['status']=='investigating' and (skip or time.monotonic()-r['submitted_at']>30):r.update(status='unavailable',message='Comparison proceeded without HeyOtto. No later prediction will replace this result.')
            if r['status']=='investigating':return None
            r['revealed']=True
            return copy.deepcopy({'case':r['case'],'submission':r['submission'],'ai':r['prediction'],'ai_message':r['message']})
MANAGER=Investigator()
