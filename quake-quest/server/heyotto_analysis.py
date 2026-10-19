"""Blind numerical preparation, strict phase validation and geographical fitting.
No catalogue, student answers or reference picks enter these functions.
"""
from pathlib import Path
import json, math
import numpy as np
MODEL=json.loads((Path(__file__).resolve().parents[1]/'app/seismic-model.json').read_text())
IDS=('STATION_A','STATION_B','STATION_C')
PROMPT=Path(__file__).with_name('heyotto_prompt.txt').read_text(encoding='utf-8')

def ring_km(p,s):
    if p is None or s is None or not 0<s-p<=MODEL['maxDelaySeconds']:return None
    return (s-p)/(1/MODEL['sVelocityKmS']-1/MODEL['pVelocityKmS'])

def distance_km(a,b):
    x,y=math.radians(a['lat']),math.radians(b['lat']);dl=math.radians(a['lon']-b['lon'])
    h=math.sin((x-y)/2)**2+math.cos(x)*math.cos(y)*math.sin(dl/2)**2
    return MODEL['earthDiameterKm']*math.asin(math.sqrt(max(0,min(1,h))))

def envelope(segments,start,duration,step,normalise=True):
    n=round(duration/step);peaks=np.zeros(n);coverage=[[] for _ in range(n)]
    for seg in segments:
        ds=seg['step']
        if not math.isfinite(ds) or ds<=0:continue
        for i,pair in enumerate(seg['values']):
            a=seg['start']+i*ds;b=a+ds
            if b<=start or a>=start+duration or pair is None or len(pair)!=2 or any(v is None or not math.isfinite(v) for v in pair):continue
            for j in range(max(0,math.floor((a-start)/step)),min(n,math.ceil((b-start)/step))):
                lo=max(a,start+j*step);hi=min(b,start+(j+1)*step)
                if hi-lo<1e-8:continue
                peaks[j]=max(peaks[j],abs(pair[0]),abs(pair[1]));coverage[j].append((lo,hi))
    values=[]
    for j,intervals in enumerate(coverage):
        total=0;end=-math.inf
        for a,b in sorted(intervals):total+=max(0,b-max(a,end));end=max(end,b)
        values.append(float(peaks[j]) if total>=step-1e-6 else None)
    scale=max((v for v in values if v is not None),default=0) or 1
    return [None if v is None else min(1000,math.floor(v/scale*1000+.5)) if normalise else v for v in values]

def select_window(traces,start=0,step=3.6):
    """Robust sustained excess energy, combined over stations; no event timing hint.
    Optimise the weakest station's evidence first; isolated single-station peaks
    cannot determine a window. Then place background before the combined onset.
    """
    n=min(map(len,traces));width=max(2,round(60/step))
    if n<width:raise ValueError('Not enough common recording for a 60-second window.')
    scores=[]
    for values in traces:
        x=np.array([np.nan if v is None else v for v in values[:n]],dtype=float)
        good=x[np.isfinite(x)]
        if len(good)<width:raise ValueError('A station has insufficient waveform coverage.')
        baseline=max(float(np.median(good)),1e-9)
        # Cap each sample's influence and demand sustained local activity.
        excess=np.where(np.isfinite(x),np.clip(np.log1p(x/baseline)-math.log(3),0,5),0)
        smooth=np.convolve(excess,np.ones(3)/3,mode='same')
        scores.append(smooth)
    sums=np.array([np.convolve(s,np.ones(width),mode='valid')/width for s in scores])
    combined=np.min(sums,axis=0)*2+np.median(sums,axis=0)
    best=int(np.argmax(combined))
    if combined[best]<.08:raise ValueError('No convincing shared activity found in the three recordings.')
    # Earliest sustained increase near this multi-station cluster; preserve 8 s background.
    lo=max(0,best-round(15/step));hi=min(n,best+width)
    onsets=[];ends=[]
    for score in scores:
        threshold=max(.15,float(np.max(score[lo:hi]))*.18)
        active=np.flatnonzero(score[lo:hi]>threshold)
        if len(active):onsets.append(lo+int(active[0]));ends.append(lo+int(active[-1]))
    onset=start+min(onsets)*step
    window=max(start,min(start+(n-width)*step,onset-8))
    limitation=[]
    if len(onsets)<3:limitation.append('Not all three stations show a sustained onset in this shared minute; some arrivals may be outside it or unresolved.')
    if start+max(ends)*step>window+55:
        window=max(start,min(start+(n-width)*step,start+best*step))
        limitation.append('Shared activity and decay may extend beyond the selected 60 seconds; the most informative common window was used.')
    if any(any(v is None for v in trace[best:best+width]) for trace in traces):limitation.append('The selected region contains missing samples.')
    return round(window*4)/4,limitation

def prepare_data(case,stations,waveform):
    # The loader is the same one used to draw student recordings. Overview only
    # narrows the search; fine data refines it before the final 0.25 s export.
    coarse=[envelope(waveform(case,s['code'],3,'overview',0)['segments'],0,7200,3.6,False) for s in stations]
    rough,notes=select_window(coarse)
    region=max(0,min(7080,math.floor(rough-30)))
    segments=[]
    for s in stations:
        chunks=[]
        for index in range(int(region//300),int((region+120-1e-6)//300)+1):chunks.extend(waveform(case,s['code'],3,'fine',index)['segments'])
        segments.append(chunks)
    refined,extra=select_window([envelope(s,region,120,.25,False) for s in segments],region,.25)
    refined=max(0,min(7140,refined));rows=[]
    for ident,segs in zip(IDS,segments):
        vals=envelope(segs,refined,60,.25)
        if sum(v is not None for v in vals)<120:raise ValueError('Too much missing data in the selected AI window.')
        rows.append({'station_id':ident,'values':[[round(refined+i*.25,2),v] for i,v in enumerate(vals)]})
    return dict(time_reference='seconds_since_recording_start',window_start_s=refined,window_end_s=refined+60,bin_seconds=.25,representation='timestamped_peak_absolute_amplitude',stations=rows),list(dict.fromkeys(notes+extra))

def strict_json(text):
    def pairs(items):
        result={}
        for k,v in items:
            if k in result:raise ValueError('Duplicate JSON field: '+k)
            result[k]=v
        return result
    def invalid(v):raise ValueError('Non-finite JSON number')
    return json.loads(text,object_pairs_hook=pairs,parse_constant=invalid)

def number(v):return type(v) in (int,float) and math.isfinite(v)
def validate(text,data):
    obj=strict_json(text)
    required={'time_reference','stations','suggested_detail_window_s','cross_station_consistency','limitations'}
    if not isinstance(obj,dict) or set(obj)!=required:raise ValueError('Expected the exact response schema.')
    if obj['time_reference']!='seconds_since_recording_start':raise ValueError('Wrong time reference.')
    rows=obj['stations']
    if not isinstance(rows,list) or len(rows)!=3 or any(not isinstance(r,dict) for r in rows) or sorted(r.get('station_id','') for r in rows)!=sorted(IDS):raise ValueError('Require exactly STATION_A, STATION_B and STATION_C.')
    lo,hi=data['window_start_s'],data['window_end_s']
    sent={r['station_id']:{t for t,v in r['values'] if v is not None} for r in data['stations']}
    for row in rows:
        if set(row)!={'station_id','p','s'}:raise ValueError('Unexpected station fields.')
        for phase in ('p','s'):
            p=row[phase]
            if not isinstance(p,dict) or set(p)!={'arrival_s','plausible_interval_s','confidence','evidence'}:raise ValueError('Invalid phase schema.')
            if not isinstance(p['evidence'],str) or len(p['evidence'].split())>30:raise ValueError('Evidence must be at most 30 words.')
            t,interval=p['arrival_s'],p['plausible_interval_s']
            if t is None:
                if interval is not None or p['confidence']!='unresolved':raise ValueError('Unresolved phases require nulls and unresolved confidence.')
            else:
                if not number(t) or t not in sent[row['station_id']] or not lo<=t<hi:raise ValueError('Arrival must equal a transmitted non-missing timestamp.')
                if p['confidence'] not in ('high','medium','low'):raise ValueError('Invalid confidence.')
                if not isinstance(interval,list) or len(interval)!=2 or not all(map(number,interval)) or not lo<=interval[0]<=t<=interval[1]<=hi or interval[1]-interval[0]<.25:raise ValueError('Invalid plausible interval.')
        p,s=row['p']['arrival_s'],row['s']['arrival_s']
        if p is not None and s is not None and s<=p:raise ValueError('S must follow P.')
    w=obj['suggested_detail_window_s']
    if w is not None and (not isinstance(w,list) or len(w)!=2 or not all(map(number,w)) or not lo<=w[0]<w[1]<=hi or w[1]-w[0]>60):raise ValueError('Invalid detail window.')
    if not isinstance(obj['cross_station_consistency'],str) or len(obj['cross_station_consistency'])>3000:raise ValueError('Invalid consistency explanation.')
    if not isinstance(obj['limitations'],list) or len(obj['limitations'])>20 or any(not isinstance(x,str) or len(x)>1000 for x in obj['limitations']):raise ValueError('Invalid limitations.')
    obj['stations'].sort(key=lambda r:IDS.index(r['station_id']))
    return obj

def triangulate(stations,rows):
    radii=[ring_km(r['p']['arrival_s'],r['s']['arrival_s']) for r in rows]
    if any(r is None for r in radii):return None
    # Spherical least squares, multiple starting points. Student workflow has
    # no automatic solver: students manually place their pin against these radii.
    lat0=sum(s['lat'] for s in stations)/3;lon0=sum(s['lon'] for s in stations)/3
    if max(distance_km(a,b) for a in stations for b in stations)<.1:return None
    def point(lat,lon):return {'lat':max(-89.9,min(89.9,lat)),'lon':(lon+180)%360-180}
    def loss(p):return sum((distance_km(p,s)-r)**2 for s,r in zip(stations,radii))/3
    solutions=[]
    reach=max(radii)/111+1
    for a in (-reach,0,reach):
        for b in (-reach,0,reach):
            p=point(lat0+a,lon0+b/max(.1,math.cos(math.radians(lat0))));v=loss(p);step=reach
            for _ in range(180):
                candidates=[point(p['lat']+da*step,p['lon']+db*step/max(.1,math.cos(math.radians(p['lat'])))) for da,db in ((-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,1),(-1,1),(1,-1))]
                q=min(candidates,key=loss);nv=loss(q)
                if nv<v:p,v=q,nv
                else:step*=.5
                if step<1e-6:break
            solutions.append((v,p))
    v,p=min(solutions,key=lambda x:x[0])
    return {**p,'fit_rms_km':math.sqrt(v),'ambiguous':any(abs(w-v)<.05 and distance_km(p,q)>5 for w,q in solutions)}
