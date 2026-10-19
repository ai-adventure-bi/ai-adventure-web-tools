"""Offline browser fixture. Never imported by the production launcher."""
import sys,importlib.util,time,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
spec=importlib.util.spec_from_file_location('checks',Path(__file__).with_name('heyotto-check.py'));checks=importlib.util.module_from_spec(spec);spec.loader.exec_module(checks)
import quake_api as api
from heyotto_service import Investigator
class Provider(checks.FakeProvider):
    def analyse(self,key,system,data,correction=None):
        if key=='slow-test-key':time.sleep(8)
        if key=='malformed-test-key':return '{bad json}'
        return super().analyse(key,system,data,correction)
api.MANAGER=Investigator(Provider())
base=[dict(s,network='GB',name=s['code']+' test station',elevation=20,location='00',channel='HHZ',rate=100,method='automatic candidate',quality=10,p=4794+i*10,uncertainty=1.5) for i,s in enumerate(checks.STATIONS)]
base += [dict(base[i],code='EX'+str(i),lat=base[i]['lat']+.2,lon=base[i]['lon']+.3) for i in range(3)]
api.catalogue=lambda:[dict(id=id,date='2026-10-13',magnitude=1.2,verified=False) for id in ['fixture','fixture2']]
api.event=lambda id:dict(id=id,date='2026-10-13',time='2026-10-13T10:00:00Z',magnitude=1.2,depth=5,verified=False,lat=56.1,lon=-4.6,place='Test earthquake',link='https://www.bgs.ac.uk/')
api.selection=lambda q,count:dict(stations=base[:count],rejected=[])
api.inventory=lambda q:base
original=checks.wave
def wave(case,code,count,level,index):
    canonical=['LAWE','EAB','INVG'][[s['code'] for s in base].index(code)%3]
    if level in ('fine','overview'):return original(case,canonical,count,level,index)
    duration=60 if level=='detail' else 1800;start=index*duration;segments=[]
    for chunk in range(start//300,math.ceil((start+duration)/300)):segments+=original(case,canonical,count,'fine',chunk)['segments']
    return dict(segments=segments,coverage=1)
api.waveform=wave
api.environment=lambda *a:dict(available=False,noiseRisk='unknown',urbanLevel='unknown')
api.photo=lambda code:b''
print('OFFLINE HEYOTTO TEST FIXTURE: http://127.0.0.1:8767',flush=True)
api.ThreadingHTTPServer(('127.0.0.1',8767),api.Handler).serve_forever()
