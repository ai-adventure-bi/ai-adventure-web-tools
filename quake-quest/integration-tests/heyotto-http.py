import requests,time
base='http://127.0.0.1:8767/api/quake-quest/heyotto/'
s=requests.Session()
r=s.post(base+'connect',json={'key':'test-only-key'});r.raise_for_status();assert 'HttpOnly' in r.headers['Set-Cookie'] and 'SameSite=Strict' in r.headers['Set-Cookie']
assert s.get(base+'status').json()['connected']
assert s.post(base+'disconnect',json={},headers={'Origin':'https://unrelated.example'}).status_code==403
r=s.post(base+'start',json={'case':'fixture','round':'http-sealed','stations':['LAWE','EAB','INVG']});r.raise_for_status()
assert s.post(base+'reveal',json={'round':'http-sealed'}).status_code==409
for i in range(60):
    status=s.get(base+'round',params={'id':'http-sealed'}).json()
    assert set(status)=={'id','status','message','locked'}
    if status['status']=='ready':break
    time.sleep(.1)
assert status['status']=='ready',status
assert s.post(base+'submit',json={'round':'http-sealed','guess':{'lat':56,'lon':-4},'picks':{},'count':6}).status_code==200
assert s.post(base+'submit',json={'round':'http-sealed','guess':{'lat':57,'lon':-4},'picks':{},'count':6}).status_code==409
result=s.post(base+'reveal',json={'round':'http-sealed'}).json()
assert len(result['ai']['mapping'])==3 and 'test-only-key' not in str(result)
s.post(base+'disconnect',json={}).raise_for_status()
assert not s.get(base+'status').json()['connected']
print('PASS HTTP session cookies, cross-origin protection, sealed prediction, immutable submission, reveal and disconnect')
