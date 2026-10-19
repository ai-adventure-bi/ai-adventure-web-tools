import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import quake_api as api
assert api.safe_place('  DRUMTOCHTY, UK  ')=='DRUMTOCHTY, UK'
for value in ['', 'x'*121, 'Displaying the map https://openstreetmap.org', 'var map = L.map();']:
    assert api.safe_place(value)=='BGS recorded'
api.catalogue=lambda:[{'id':'parser-test','link':'https://example.invalid','verified':False}]
api.fetch=lambda *a,**kw:b'DATE 01/10/2026 ORIGIN TIME 12:30:00 LOCATION 56.1 -4.2 DEPTH 5 MAGNITUDE 1.2 LOCALITY DRUMTOCHTY <script>var map = "https://openstreetmap.org";</script> Maps'
assert api.event('parser-test')['place']=='DRUMTOCHTY'
print('PASS place fallback and embedded map script removal')
