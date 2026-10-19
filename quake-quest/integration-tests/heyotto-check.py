import sys,json,copy,time,unittest,threading
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from heyotto_analysis import *
from heyotto_service import Investigator,ApiError
from heyotto_provider import HeyOttoProvider,ProviderError

STATIONS=[dict(code=c,lat=lat,lon=lon) for c,lat,lon in [('LAWE',56.3,-5.1),('EAB',56.8,-3.8),('INVG',55.7,-4.1)]]
def wave(case,code,count,level,index):
    duration,step={'overview':(7200,3.6),'fine':(300,.05)}[level];start=duration*index
    delay=[0,10,12][[s['code'] for s in STATIONS].index(code)]
    vals=[]
    for i in range(round(duration/step)):
        t=start+i*step;value=2
        for onset,amp in [(4794+delay,50),(4800+delay,100)]:
            if t>=onset:value+=amp*math.exp(-(t-onset)/8)
        vals.append([-value,value*.8])
    return {'segments':[{'start':start,'step':step,'values':vals}],'coverage':1}
def reply(data,unresolved=False):
    start=data['window_start_s'];rows=[]
    for i,ident in enumerate(IDS):
        def phase(t):return {'arrival_s':t,'plausible_interval_s':[t,t+.25] if t is not None else None,'confidence':'medium' if t is not None else 'unresolved','evidence':'Synthetic test response.'}
        rows.append({'station_id':ident,'p':phase(start+10+i),'s':phase(None if unresolved else start+15+2*i)})
    return {'time_reference':'seconds_since_recording_start','stations':rows,'suggested_detail_window_s':None,'cross_station_consistency':'Test fixture.','limitations':[]}
class FakeProvider:
    def __init__(self):self.calls=[];self.bad=False;self.fail=False
    def authenticate(self,key):
        if key=='invalid-test-key':raise ProviderError('Invalid key')
    def analyse(self,key,system,data,correction=None):
        self.calls.append((system,copy.deepcopy(data),correction))
        if self.fail:raise ProviderError('Rate limited')
        if self.bad:return '{"invalid":true}'
        return json.dumps(reply(data))
class AnalysisTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.data,cls.notes=prepare_data('fixture',STATIONS,wave)
    def test_window_and_blind_data(self):
        d=self.data;self.assertLessEqual(d['window_start_s'],4794);self.assertGreaterEqual(d['window_end_s'],4812)
        self.assertEqual(d['window_end_s']-d['window_start_s'],60)
        self.assertEqual(set(d),{'time_reference','window_start_s','window_end_s','bin_seconds','representation','stations'})
        for r in d['stations']:
            self.assertEqual(len(r['values']),240);self.assertEqual(set(r),{'station_id','values'})
            self.assertEqual([p[0] for p in r['values']],[d['window_start_s']+.25*i for i in range(240)])
            self.assertEqual(max(v for _,v in r['values'] if v is not None),1000)
        print('Shared window:',d['window_start_s'],d['window_end_s'])
    def test_timestamp_7954(self):
        vals=envelope([{'start':4770,'step':.05,'values':[[-100,80] if i==480 else [-1,2] for i in range(1200)]}],4770,60,.25)
        self.assertEqual(4770+vals.index(1000)*.25,4794);self.assertNotEqual(4770+vals.index(1000)*.25,4869)
    def test_null_and_scaling(self):
        self.assertEqual(envelope([{'start':0,'step':.25,'values':[[0,0],None,[-20,10],[-10,5]]}],0,1,.25),[0,None,1000,500])
        self.assertEqual(envelope([{'start':0,'step':.1,'values':[[1,1]]}]*2,0,.25,.25),[None])
    def test_prompt_exact(self):
        original=Path(r'C:\Users\jackh\.codex\attachments\8d450472-e376-473f-b83a-35d7f48cc29f\Pasted text.txt')
        if original.exists():self.assertEqual(PROMPT.strip(),original.read_text(encoding='utf-8-sig').split('\nDATA:')[0].strip())
        self.assertNotIn('[[5160,3]',PROMPT)
    def test_validation(self):
        good=reply(self.data);self.assertEqual(validate(json.dumps(good),self.data),good)
        self.assertIsNone(validate(json.dumps(reply(self.data,True)),self.data)['stations'][0]['s']['arrival_s'])
        changes=[lambda x:x['stations'][0]['p'].update(arrival_s=4869),lambda x:x['stations'][0]['p'].update(arrival_s=self.data['window_start_s']+.01),lambda x:x['stations'][0]['s'].update(arrival_s=x['stations'][0]['p']['arrival_s']),lambda x:x['stations'][0]['p'].update(confidence='certain'),lambda x:x['stations'][0]['p'].update(plausible_interval_s=[0,99999]),lambda x:x['stations'][1].update(station_id='STATION_A')]
        for change in changes:
            obj=copy.deepcopy(good);change(obj)
            with self.assertRaises(ValueError):validate(json.dumps(obj),self.data)
        for raw in ['{} {}','{"a":1,"a":2}','{"a":NaN}','```json\n{}\n```']:
            with self.assertRaises(ValueError):validate(raw,self.data)
    def test_triangulation_and_metrics(self):
        actual={'lat':56.1,'lon':-4.6};rows=[]
        for s in STATIONS:
            delay=distance_km(s,actual)*(1/MODEL['sVelocityKmS']-1/MODEL['pVelocityKmS'])
            self.assertAlmostEqual(ring_km(0,delay),distance_km(s,actual))
            rows.append({'p':{'arrival_s':0},'s':{'arrival_s':delay}})
        location=triangulate(STATIONS,rows);self.assertLess(distance_km(location,actual),.01)
        self.assertAlmostEqual(distance_km({'lat':0,'lon':0},{'lat':0,'lon':1}),111.1949266,places=5)
        rows[0]['s']['arrival_s']=None;self.assertIsNone(triangulate(STATIONS,rows))
    def test_no_shared_signal(self):
        with self.assertRaises(ValueError):select_window([[1]*2000]*3)
        a=[1]*2000;a[100]=10000
        with self.assertRaises(ValueError):select_window([a,[1]*2000,[1]*2000])
    def test_sealed_round_and_immutable_lock(self):
        p=FakeProvider();m=Investigator(p);token=m.connect('test-only-key');m.start(token,'fixture','round-1',['LAWE','EAB','INVG'],lambda _:STATIONS,wave)
        for _ in range(300):
            r=m.get(token,'round-1')
            if r['status']!='investigating':break
            time.sleep(.01)
        self.assertEqual(r['status'],'ready');self.assertNotIn('prediction',m.public(r))
        with self.assertRaises(ApiError):m.reveal(token,'round-1')
        g={'lat':56,'lon':-4};m.submit(token,'round-1',g,{'LAWE':{'p':4794,'s':4800}},6)
        with self.assertRaises(ApiError):m.submit(token,'round-1',{'lat':57,'lon':-4},{},6)
        revealed=m.reveal(token,'round-1');self.assertEqual(revealed['submission']['guess'],g);self.assertEqual(len(revealed['ai']['mapping']),3)
        self.assertEqual(len(p.calls),1);self.assertNotIn('"lat":',json.dumps(p.calls));self.assertNotIn('LAWE',json.dumps(p.calls))
        m.start(token,'fixture','round-1',['LAWE','EAB','INVG'],lambda _:STATIONS,wave);self.assertEqual(len(p.calls),1)
        m.disconnect(token);self.assertIsNone(m.session(token))
    def test_retry_and_failure(self):
        p=FakeProvider();p.bad=True;m=Investigator(p);token=m.connect('test-only-key');m.start(token,'fixture','bad',['LAWE','EAB','INVG'],lambda _:STATIONS,wave)
        for _ in range(300):
            r=m.get(token,'bad')
            if r['status']!='investigating':break
            time.sleep(.01)
        self.assertEqual(r['status'],'unavailable');self.assertEqual(len(p.calls),2);self.assertIsNotNone(p.calls[1][2])
        with self.assertRaises(ApiError):m.connect('invalid-test-key')
    def test_timeout_and_skip(self):
        m=Investigator(FakeProvider());token=m.connect('test-only-key');s=m.session(token)
        r=dict(id='wait',status='investigating',message='Wait',started=time.monotonic()-241,submission=None,prediction=None,case='fixture');s['rounds']['wait']=r
        self.assertEqual(m.get(token,'wait')['status'],'unavailable')
        r.update(status='investigating',started=time.monotonic());m.submit(token,'wait',{'lat':56,'lon':-4},{},3)
        self.assertIsNone(m.reveal(token,'wait'));self.assertIsNone(m.reveal(token,'wait',True)['ai']);self.assertEqual(r['status'],'unavailable')
    def test_documented_provider(self):
        p=HeyOttoProvider()
        with patch.object(p,'request',return_value={'data':[{'id':'heyotto'}]}) as call:p.authenticate('test');self.assertEqual(call.call_args.args[:2],('GET','/models'))
        with patch.object(p,'request',return_value={'choices':[{'finish_reason':'stop','message':{'role':'assistant','content':'{}'}}]}) as call:
            p.analyse('test',PROMPT,self.data);payload=call.call_args.args[3]
            self.assertEqual(payload['messages'][0]['role'],'user');self.assertNotIn('response_format',payload);self.assertNotIn('conversation_id',payload);self.assertNotIn('system',[x['role'] for x in payload['messages']])
            self.assertTrue(payload['messages'][0]['content'].startswith(PROMPT))
if __name__=='__main__':unittest.main(verbosity=2)
