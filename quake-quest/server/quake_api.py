"""Quake Quest API and static server. No new waveform files are written to disk."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit, parse_qs, urljoin, unquote
from collections import OrderedDict
from concurrent.futures import Future
import threading, time, json, hashlib, io, math, re, html, gzip, argparse
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from http.cookies import SimpleCookie
import os
from heyotto_service import MANAGER,ApiError
import requests
import numpy as np
from obspy import read, UTCDateTime

ROOT=Path(__file__).resolve().parents[1]
PRIVATE=ROOT/'investigation/private'
EIDA='https://eida.bgs.ac.uk/fdsnws/'
UPSTREAM=threading.BoundedSemaphore(3)
class Cache:
    def __init__(self,limit=64*1024*1024):self.limit=limit;self.size=0;self.items=OrderedDict();self.jobs={};self.lock=threading.RLock()
    def get(self,key,loader,ttl=900):
        with self.lock:
            now=time.monotonic()
            for k,(expires,b) in list(self.items.items()):
                if expires<now:self.size-=len(b);del self.items[k]
            if key in self.items:
                self.items.move_to_end(key);return self.items[key][1]
            owner=key not in self.jobs
            if owner:self.jobs[key]=Future()
            job=self.jobs[key]
        if not owner:return job.result(timeout=150)
        try:
            b=loader()
            with self.lock:
                if len(b)<=self.limit:
                    while self.items and self.size+len(b)>self.limit:
                        _,(_,old)=self.items.popitem(last=False);self.size-=len(old)
                    self.items[key]=(now+ttl,b);self.size+=len(b)
                job.set_result(b)
            return b
        except Exception as e:job.set_exception(e);raise
        finally:
            with self.lock:self.jobs.pop(key,None)
CACHE=Cache()
def packed(value):return json.dumps(value,separators=(',',':'),allow_nan=False).encode()
def memo(key,fn,ttl=900):return json.loads(CACHE.get(key,lambda:packed(fn()),ttl))
def fetch(url,params=None,ttl=900):
    key='url:'+url+json.dumps(params,sort_keys=True)
    def load():
        with UPSTREAM:
            r=requests.get(url,params=params,timeout=(8,45),headers={'User-Agent':'QuakeQuest/2 educational investigation'},stream=True)
            r.raise_for_status()
            data=bytearray()
            for part in r.iter_content(65536):
                data.extend(part)
                if len(data)>16*1024*1024:raise ValueError('Upstream response exceeds 16 MB request limit')
            if not data:raise ValueError('No data returned by upstream service')
            return bytes(data)
    return CACHE.get(key,load,ttl)
def distance(a,b):
    x,y=math.radians(a['lat']),math.radians(b['lat']);dl=math.radians(a['lon']-b['lon'])
    return 12742*math.asin(min(1,math.sqrt(math.sin((x-y)/2)**2+math.cos(x)*math.cos(y)*math.sin(dl/2)**2)))
CURATED={'id':'verified-01','date':'2 September 2026','time':'2026-09-02T05:34:55.1Z','lat':54.776,'lon':-2.483,'depth':8,'magnitude':1.1,'place':'Garrigill, Cumbria','link':'https://quakes.bgs.ac.uk/earthquakes/recent_events/20260902053338.html','verified':True}
def catalogue():
    def load():
        result=[]
        try:
            xml=ET.fromstring(fetch('https://quakes.bgs.ac.uk/feeds/MhSeismology.xml',ttl=300))
            for item in xml.findall('.//item')[:20]:
                link=item.findtext('link','').replace('http:','https:').replace('https://earthquakes.bgs.ac.uk/','https://quakes.bgs.ac.uk/')
                if not re.match(r'https://(?:www\.)?(?:quakes|earthquakes).bgs.ac.uk/earthquakes/recent_events/\d+\.html',link) or link==CURATED['link']:continue
                desc=' '.join(item.itertext());m=re.search(r'(?:magnitude|ML|\bM)\s*[:=]?\s*([\d.]+)',desc,re.I)
                result.append({'id':hashlib.sha256(link.encode()).hexdigest()[:16],'link':link,'magnitude':float(m[1]) if m else None,'date':parsedate_to_datetime(item.findtext('pubDate')).date().isoformat() if item.findtext('pubDate') else 'Recent event','verified':False})
        except Exception as e:raise RuntimeError('BGS catalogue unavailable. Please retry shortly.') from e
        return result
    return memo('catalogue',load,300)
def safe_place(value):
    value=re.sub(r'\s+',' ',str(value)).strip()
    if not value or len(value)>120 or re.search(r'https?://|www\.|[<>{};=]|openstreetmap|javascript|function\s*\(|displaying the map',value,re.I):
        return 'BGS recorded'
    return value

def event(case):
    if case==CURATED['id']:return CURATED.copy()
    item=next((q for q in catalogue() if q['id']==case),None)
    if item is None:raise ValueError('Unknown earthquake case')
    if item.get('verified'):return item
    def load():
        page=fetch(item['link']).decode(errors='replace')
        page=re.sub(r'<(script|style|noscript)\b[^>]*>.*?</\1\s*>',' ',page,flags=re.I|re.S)
        text=html.unescape(re.sub('<[^>]+>',' ',page));text=re.sub(r'\s+',' ',text)
        date=re.search(r'DATE\s+(\d{2})/(\d{2})/(\d{4})',text);clock=re.search(r'ORIGIN TIME\s+([\d:.]+)',text);loc=re.search(r'LOCATION\s+([-\d.]+)\s+([-\d.]+)',text)
        depth=re.search(r'DEPTH\s+([\d.]+)',text);mag=re.search(r'MAGNITUDE\s+([\d.]+)',text);place=re.search(r'LOCALITY\s+(.*?)\s+(?:Maps|Seismogram)',text)
        if not(date and clock and loc and mag):raise ValueError('Official event details could not be verified')
        return {**item,'time':f'{date[3]}-{date[2]}-{date[1]}T{clock[1]}Z','date':f'{date[3]}-{date[2]}-{date[1]}','lat':float(loc[1]),'lon':float(loc[2]),'depth':float(depth[1]) if depth else 0,'magnitude':float(mag[1]),'place':safe_place(place[1] if place else '')}
    return memo('event:'+case,load,3600)
def start_time(q):
    offset=4495.1 if q['verified'] else 2700+int(hashlib.sha256(q['id'].encode()).hexdigest()[:4],16)%3600
    return UTCDateTime(q['time'])-offset

def inventory(q):
    def load():
        if q['verified']:return json.loads((ROOT/'server/reference.json').read_text())['stations']
        if q['verified'] and (PRIVATE/'stations.txt').exists():stations=(PRIVATE/'stations.txt').read_text();channels=(PRIVATE/'channels.txt').read_text()
        else:
            params=dict(network='GB',starttime=str(start_time(q)),endtime=str(start_time(q)+7200),format='text')
            stations=fetch(EIDA+'station/1/query',{**params,'level':'station'},3600).decode();channels=fetch(EIDA+'station/1/query',{**params,'level':'channel'},3600).decode()
        result=[]
        for line in stations.splitlines():
            if not line or line.startswith('#'):continue
            p=line.split('|');s=dict(network=p[0],code=p[1],lat=float(p[2]),lon=float(p[3]),elevation=float(p[4]),name=p[5].strip() or p[1])
            options=[l.split('|') for l in channels.splitlines() if l.startswith(s['network']+'|'+s['code']+'|') and l.split('|')[3].endswith('Z')]
            options.sort(key=lambda c:0 if c[3]=='HHZ' else 1)
            s['channels']=[dict(location=c[2],channel=c[3],rate=float(c[14])) for c in options];s['distance']=distance(s,q)
            if options:result.append(s)
        return sorted(result,key=lambda s:s['distance'])
    return memo('inventory:'+q['id'],load,3600)
def stream(q,s,a,b):
    if q['verified'] and (PRIVATE/(s['code']+'.mseed')).exists():
        raw=CACHE.get('reference:'+s['code'],lambda:(PRIVATE/(s['code']+'.mseed')).read_bytes())
    else:
        raw=fetch(EIDA+'dataselect/1/query',dict(network=s['network'],station=s['code'],location=s['location'] or '--',channel=s['channel'],starttime=str(a),endtime=str(b)))
    st=read(io.BytesIO(raw));st=st.select(network=s['network'],station=s['code'],channel=s['channel'],location=s['location']).trim(a,b)
    if not st:raise ValueError('No matching registered channel in returned data')
    st.merge(method=0);return st.split()

def selection(q,count):
    def load():
        chosen=[];rejected=[]
        references={'EDMD':(5.9,.4),'AQ12':(7.4,.4),'KESW':(8,.4),'CTON':(11.4,.4),'AP12':(11.8,.8),'ESK':(12.6,.4)}
        audit={s['code']:s for s in json.loads((ROOT/'server/reference.json').read_text())['audit']} if q['verified'] else {}
        for candidate in inventory(q)[:14]:
            if len(chosen)>=count:break
            if q['verified']:
                if candidate['code'] not in references:
                    rejected.append({'code':candidate['code'],'reason':'P onset unclear in noise; not in the selected official seismogram stations.'});continue
                ref=references[candidate['code']];s={**candidate,**candidate['channels'][0],'p':float(UTCDateTime(q['time'])-start_time(q))+ref[0],'uncertainty':ref[1],'method':'manual','quality':round(audit[candidate['code']]['eventRmsNoiseRatio'],2)}
                chosen.append(s);continue
            errors=[]
            for channel in candidate['channels'][:3]:
                s={**candidate,**channel}
                try:
                    origin=UTCDateTime(q['time']);st=stream(q,s,origin-20,origin+100)
                    if len(st)!=1 or st[0].stats.npts/st[0].stats.sampling_rate<119:raise ValueError('Incomplete event-time recording')
                    tr=st[0];tr.detrend('linear').taper(.02).filter('bandpass',freqmin=2,freqmax=min(15,tr.stats.sampling_rate*.4),zerophase=True)
                    t=tr.times(reftime=origin);noise=np.std(tr.data[(t>-15)&(t<-2)]);signal=np.std(tr.data[(t>3)&(t<60)]);ratio=float(signal/max(noise,1e-9))
                    # Energy onset in a broad travel-time search interval: automatic candidate, not an analyst pick.
                    rms=np.sqrt(np.convolve(tr.data.astype(float)**2,np.ones(max(1,int(.15*tr.stats.sampling_rate)))/max(1,int(.15*tr.stats.sampling_rate)),mode='same'))
                    found=np.flatnonzero((t>max(0,s['distance']/8-2))&(t<min(90,s['distance']/4+6))&(rms>5*max(noise,1e-9)))
                    if ratio<1.5 or not len(found):raise ValueError('No clear automatic event onset above background; not proof of no detection')
                    s.update(p=float(origin-start_time(q))+float(t[found[0]]),uncertainty=1.5,method='automatic candidate',quality=round(ratio,2));chosen.append(s);break
                except Exception as e:errors.append(f"{channel['channel']}: {e}")
            else:rejected.append({'code':candidate['code'],'reason':'; '.join(errors)})
        ordered=sorted(chosen,key=lambda s:s['p'])
        if count>3:
            first=selection(q,3)['stations'];codes={s['code'] for s in first}
            ordered=first+[s for s in ordered if s['code'] not in codes]
        return {'stations':ordered,'rejected':rejected}
    return memo('selection:'+q['id']+':'+str(count),load,1800)
def manifest(case,count):
    q=event(case);result=selection(q,count)
    return {'id':case,'date':q['date'],'magnitude':q['magnitude'],'depth':q['depth'],'duration':7200,'verified':q['verified'],'stations':[{k:s[k] for k in ['network','code','name','lat','lon','elevation','location','channel','rate','method','quality']} for s in result['stations']],'rejected':result['rejected'],'requested':count}
LEVELS={'overview':(7200,2000),'medium':(1800,3600),'fine':(300,6000),'detail':(60,6000)}
def waveform(case,code,count,level,index):
    if level not in LEVELS:raise ValueError('Invalid resolution')
    duration,buckets=LEVELS[level]
    if index<0 or index>=7200//duration:raise ValueError('Chunk outside recording')
    q=event(case);s=next((s for s in selection(q,count)['stations'] if s['code']==code),None)
    if not s:raise ValueError('Station not selected for this case')
    def load():
        existing=ROOT/'investigation/data'/code/f'{level}-{index}.json'
        if q['verified'] and existing.exists():
            d=json.loads(existing.read_text());d['values']=d['values'][:max(0,math.ceil((7200-d['start'])/d['step']))];return {'segments':[d],'coverage':1,'channel':s['channel']}
        base=start_time(q);a=base+index*duration;b=a+duration
        st=stream(q,s,a-10,b+10);segments=[];total=0
        for tr in st:
            if tr.stats.npts<20:continue
            tr.detrend('linear').taper(.01).filter('bandpass',freqmin=2,freqmax=min(15,tr.stats.sampling_rate*.4),zerophase=True);tr.trim(a,b-1/tr.stats.sampling_rate)
            rate=tr.stats.sampling_rate;step=max(1,math.ceil(duration*rate/buckets));x=tr.data
            if not len(x):continue
            values=[[round(float(x[j:j+step].min()),2),round(float(x[j:j+step].max()),2)] for j in range(0,len(x),step)]
            segments.append({'start':float(tr.stats.starttime-base),'step':step/rate,'values':values});total+=len(x)/rate
        if not segments:raise ValueError('No samples available in this part of the recording')
        return {'segments':segments,'coverage':min(1,total/duration),'channel':s['channel']}
    return memo(f'wave:{case}:{code}:{level}:{index}',load,1800)
def photo(code):
    if not re.fullmatch('[A-Z0-9]{2,6}',code):raise ValueError('Invalid station')
    def load():
        page=f'https://earthquakes.bgs.ac.uk/data/station_book/stationbook_{code.lower()}.html';body=fetch(page,ttl=86400).decode(errors='replace')
        paths=re.findall(r'<img[^>]+src=["\']([^"\']+)',body,re.I)
        paths=[p for p in paths if code.lower() in p.lower() and re.search(r'\.(jpg|jpeg|png)$',p,re.I)]
        if not paths:raise ValueError('No BGS station photograph published')
        url=urljoin(page,paths[0]);host=urlsplit(url).hostname
        if host not in ['earthquakes.bgs.ac.uk','quakes.bgs.ac.uk']:raise ValueError('Unexpected station photo host')
        return fetch(url,ttl=86400)
    return CACHE.get('photo:'+code,load,86400)
def environment(lat,lon):
    if not(-90<=lat<=90 and -180<=lon<=180):raise ValueError('Invalid coordinates')
    def load():
        query=f'[out:json][timeout:20];(way(around:2500,{lat},{lon})[highway~"motorway|trunk|primary|secondary"];way(around:2500,{lat},{lon})[railway=rail];way(around:1500,{lat},{lon})[landuse~"residential|industrial|quarry"];way(around:2500,{lat},{lon})[aeroway=aerodrome];);out center;'
        try:
            data=json.loads(fetch('https://overpass-api.de/api/interpreter',{'data':query},86400));roads=[];rails=[];urban=0;industry=False;airport=False
            for el in data.get('elements',[]):
                tags=el.get('tags',{});c=el.get('center',el)
                if 'lat' not in c:continue
                d=distance({'lat':lat,'lon':lon},{'lat':c['lat'],'lon':c['lon']})*1000
                if 'highway' in tags:roads.append({'type':tags['highway'],'name':tags.get('name','Major road'),'distanceM':round(d)})
                if 'railway' in tags:rails.append(d)
                if tags.get('landuse')=='residential':urban+=1
                industry|=tags.get('landuse') in ['industrial','quarry'];airport|='aeroway' in tags
            road=min(roads,key=lambda r:r['distanceM']) if roads else None;risk='high' if industry or (road and road['distanceM']<300) else 'medium' if roads or rails or urban else 'low'
            return {'available':True,'noiseRisk':risk,'urbanLevel':'high' if urban>8 else 'medium' if urban else 'low','road':road,'railwayDistanceM':round(min(rails)) if rails else None,'industrialNearby':industry,'airportNearby':airport,'note':'Map-feature centre distances are approximate; not measured recording noise.'}
        except Exception:return {'available':False,'noiseRisk':'unknown','urbanLevel':'unknown','road':None,'railwayDistanceM':None,'industrialNearby':False,'airportNearby':False,'note':'Surroundings service unavailable. This is not evidence of low noise.'}
    return memo(f'env:{lat:.4f}:{lon:.4f}',load,86400)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'static-dist'),**kw)
    def ai_token(self):
        cookie=SimpleCookie()
        try:cookie.load(self.headers.get('Cookie',''))
        except Exception:return ''
        return cookie['qq_otto'].value if 'qq_otto' in cookie else ''
    def ai_post(self,path):
        try:
            origin=self.headers.get('Origin')
            if origin and urlsplit(origin).netloc!=self.headers.get('Host'):raise ApiError('Cross-origin requests are not allowed.',403)
            if self.headers.get('Sec-Fetch-Site')=='cross-site':raise ApiError('Cross-site requests are not allowed.',403)
            if self.headers.get_content_type()!='application/json':raise ApiError('JSON required.',415)
            size=int(self.headers.get('Content-Length',0))
            if not 0<size<=16384:raise ApiError('Invalid request size.',413)
            body=json.loads(self.rfile.read(size));token=self.ai_token()
            if not isinstance(body,dict):raise ApiError('JSON object required.')
            if path=='/api/heyotto/connect':
                new=MANAGER.connect(body.get('key'));MANAGER.disconnect(token)
                self.ai_cookie=f'qq_otto={new}; HttpOnly; SameSite=Strict; Path=/api/quake-quest/heyotto'+('; Secure' if os.getenv('HEYOTTO_SECURE_COOKIE')=='1' else '')
                return self.send_data({'connected':True})
            if path=='/api/heyotto/disconnect':
                MANAGER.disconnect(token);self.ai_cookie='qq_otto=; HttpOnly; SameSite=Strict; Path=/api/quake-quest/heyotto; Max-Age=0'
                return self.send_data({'connected':False})
            if path=='/api/heyotto/start':return self.send_data(MANAGER.start(token,body['case'],body['round'],body['stations'],lambda case:selection(event(case),3)['stations'][:3],waveform))
            if path=='/api/heyotto/submit':return self.send_data(MANAGER.submit(token,body['round'],body['guess'],body['picks'],body['count']))
            if path=='/api/heyotto/reveal':
                result=MANAGER.reveal(token,body['round'],body.get('skip') is True)
                if result is None:return self.send_data({'waiting':True})
                q=event(result['case']);selected=selection(q,result['submission']['count'])
                return self.send_data({**q,'arrivals':[{k:s[k] for k in ['code','p','uncertainty','method']} for s in selected['stations']],**result})
            raise ApiError('Unknown HeyOtto route.',404)
        except ApiError as e:return self.send_data({'error':str(e)},status=e.status)
        except (ValueError,KeyError,TypeError):return self.send_data({'error':'Invalid HeyOtto request.'},status=422)
        except Exception:return self.send_data({'error':'The investigation service is unavailable. Your submitted answer remains locked.'},status=503)
    def send_data(self,data,kind='application/json',status=200):
        body=packed(data) if kind=='application/json' else data
        compress='gzip' in self.headers.get('Accept-Encoding','') and kind=='application/json'
        if compress:body=gzip.compress(body)
        self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)))
        if getattr(self,'ai_cookie',None):self.send_header('Set-Cookie',self.ai_cookie);self.ai_cookie=None
        if compress:self.send_header('Content-Encoding','gzip');self.send_header('Vary','Accept-Encoding')
        self.end_headers();self.wfile.write(body)
    def check_proxy(self):
        # Optional locally; mandatory on the deployed backend (see DEPLOYMENT.md).
        import hmac
        expected=os.getenv('QUAKE_PROXY_TOKEN','')
        if expected and not hmac.compare_digest(self.headers.get('X-Quake-Proxy-Token',''),expected):
            self.send_data({'error':'Access denied.'},status=403)
            return False
        return True
    def do_GET(self):
        if not self.check_proxy():return
        url=urlsplit(self.path);args={k:v[0] for k,v in parse_qs(url.query).items()};path=url.path.replace('/api/quake-quest/','/api/',1)
        try:
            if path=='/api/heyotto/status':return self.send_data({'connected':bool(MANAGER.session(self.ai_token()))})
            if path=='/api/heyotto/round':
                try:return self.send_data(MANAGER.public(MANAGER.get(self.ai_token(),args.get('id',''))))
                except ApiError as e:return self.send_data({'error':str(e)},status=e.status)
            if path=='/api/investigation/cases':return self.send_data([{'id':q['id'],'date':q['date'],'magnitude':q['magnitude'],'verified':q['verified']} for q in catalogue()])
            if path=='/api/investigation/manifest':return self.send_data(manifest(args['case'],max(3,min(6,int(args.get('count',3))))))
            if path=='/api/investigation/wave':return self.send_data(waveform(args['case'],args['station'],max(3,min(6,int(args.get('count',3)))),args['level'],int(args['index'])))
            if path=='/api/investigation/hint':
                q=event(args['case']);p=float(UTCDateTime(q['time'])-start_time(q));return self.send_data({'start':max(0,math.floor(p/120)*120),'span':120})
            if path=='/api/station-photo':return self.send_data(photo(args['station']),'image/jpeg')
            if path=='/api/station-environment':return self.send_data(environment(float(args['lat']),float(args['lon'])))
            if path=='/api/seismic':
                q=CURATED;stations=inventory(q);events=[]
                for item in catalogue()[:6]:
                    try:events.append(event(item['id']))
                    except Exception:pass
                return self.send_data({'events':events,'stations':stations,'source':'BGS catalogue','stationSource':'BGS EIDA inventory'})
            if path=='/api/waveform':
                # Existing station explorer: retain genuine miniSEED format, limited to the latest hour.
                code=args.get('station','');network=args.get('network','GB')
                if not re.fullmatch('[A-Z0-9]{2,6}',code) or network!='GB':raise ValueError('Invalid station')
                end=UTCDateTime(args['eventTime'])+105 if args.get('eventTime') else UTCDateTime();start=end-(120 if args.get('eventTime') else 3600)
                inv=fetch(EIDA+'station/1/query',dict(network=network,station=code,level='channel',format='text',starttime=str(start),endtime=str(end)),3600).decode()
                options=[line.split('|') for line in inv.splitlines() if line.startswith(network+'|'+code+'|') and line.split('|')[3].endswith('Z')]
                for c in sorted(options,key=lambda c:c[3]!='HHZ'):
                    try:return self.send_data(fetch(EIDA+'dataselect/1/query',dict(network=network,station=code,location=c[2] or '--',channel=c[3],starttime=str(start),endtime=str(end))),'application/vnd.fdsn.mseed')
                    except Exception:continue
                raise ValueError('No available registered vertical channel')
            if path.startswith('/api/'):return self.send_data({'error':'Unknown route'},status=404)
            # Only compiled public files: never serve the project, raw data, tools or answers.
            clean=unquote(path)
            for prefix in ['/ai-adventure-web-tools/quake-quest','/quake-quest']:
                if clean.startswith(prefix+'/'):clean=clean[len(prefix):]
            if '..' in clean or '\\' in clean:return self.send_error(404)
            if clean=='/':clean='/index.html'
            target=(ROOT/'static-dist'/clean.lstrip('/')).resolve()
            if not target.is_relative_to((ROOT/'static-dist').resolve()) or not target.is_file():return self.send_error(404)
            self.path=clean;return super().do_GET()
        except (ValueError,KeyError) as e:self.send_data({'error':str(e)},status=422)
        except Exception as e:print('API failure',path,str(e),flush=True);self.send_data({'error':'BGS or map service unavailable; retry shortly. No simulated data substituted.'},status=503)
    def do_POST(self):
        if not self.check_proxy():return
        path=urlsplit(self.path).path.replace('/api/quake-quest/','/api/',1)
        if path.startswith('/api/heyotto/'):return self.ai_post(path)
        if path!='/api/investigation/reveal':return self.send_error(404)
        try:
            if int(self.headers.get('Content-Length',0))>4096:return self.send_error(413)
            body=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))));q=event(body['case']);count=max(3,min(6,int(body.get('count',3))));result=selection(q,count)
            return self.send_data({**q,'arrivals':[{k:s[k] for k in ['code','p','uncertainty','method']} for s in result['stations']]})
        except Exception as e:return self.send_data({'error':str(e)},status=422)
    def do_HEAD(self):return self.send_error(405)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8766);parser.add_argument('--host',default='127.0.0.1');a=parser.parse_args()
    print(f'Quake Quest: http://{a.host}:{a.port}',flush=True);ThreadingHTTPServer((a.host,a.port),Handler).serve_forever()
