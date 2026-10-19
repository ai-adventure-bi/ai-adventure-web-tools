'use client';
import {useEffect,useRef,useState} from 'react';
import type {Phase} from './heyotto';
import {clamp,relativeTime,type Picks} from './investigation-math';
export type View={start:number;span:number};
export type Tool='highlight'|'pan'|'p'|'s';
type Segment={start:number;step:number;values:[number,number][]};
type Data={segments:Segment[];coverage:number};
const cache=new Map<string,Promise<Data>>();
const levels=(span:number)=>span>1800?{name:'overview',duration:7200}:span>300?{name:'medium',duration:1800}:span>60?{name:'fine',duration:300}:{name:'detail',duration:60};
async function load(caseId:string,code:string,count:number,level:string,index:number){
 const key=`${caseId}:${code}:${level}:${index}`;
 if(!cache.has(key)){cache.set(key,fetch(`/api/quake-quest/investigation/wave?case=${encodeURIComponent(caseId)}&station=${encodeURIComponent(code)}&count=${count}&level=${level}&index=${index}`).then(async r=>{const d=await r.json() as Data & {error?:string};if(!r.ok)throw Error(d.error||'Recording unavailable');return d;}).catch(e=>{cache.delete(key);throw e;}));if(cache.size>48)cache.delete(cache.keys().next().value!);}
 return cache.get(key)!;
}
export default function InvestigationWaveform({caseId,code,count,view,tool,picks,color,gain,locked,aiPicks,onView,onPicks}:{caseId:string;code:string;count:number;view:View;tool:Tool;picks:Picks;color:string;gain:number;locked:boolean;aiPicks?:{p:Phase;s:Phase};onView:(v:View)=>void;onPicks:(p:Picks)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null);const [size,setSize]=useState(0);const [data,setData]=useState<Data[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [retry,setRetry]=useState(0);
 const pointers=useRef(new Map<number,number>());const drag=useRef<{kind:Tool;x:number;time:number;start:number;before:Picks}|null>(null);const pinch=useRef<{distance:number;view:View;anchor:number}|null>(null);
 useEffect(()=>{const el=canvas.current!;const ro=new ResizeObserver(()=>setSize(el.clientWidth));ro.observe(el);return()=>ro.disconnect()},[]);
 const l=levels(view.span),first=Math.floor(view.start/l.duration),last=Math.min(7200/l.duration-1,Math.floor((view.start+view.span-.00001)/l.duration));
 useEffect(()=>{let active=true;setLoading(true);setError('');const timer=setTimeout(()=>{Promise.all(Array.from({length:last-first+1},(_,i)=>load(caseId,code,count,l.name,first+i))).then(d=>{if(active)setData(d)}).catch(e=>{if(active){setData([]);setError(e.message)}}).finally(()=>{if(active)setLoading(false)})},160);return()=>{active=false;clearTimeout(timer)}},[caseId,code,count,l.name,first,last,retry]);
 useEffect(()=>{
  const el=canvas.current;if(!el)return;const ctx=el.getContext('2d')!;const w=el.clientWidth,h=128,r=window.devicePixelRatio||1;el.width=Math.round(w*r);el.height=h*r;ctx.scale(r,r);ctx.clearRect(0,0,w,h);ctx.fillStyle=getComputedStyle(el).getPropertyValue('--ui-colour').trim()||'#173449';ctx.fillRect(0,0,w,h);
  const x=(t:number)=>(t-view.start)/view.span*w;ctx.font='10px Arial';ctx.strokeStyle='#263b47';ctx.fillStyle='#9bb2bf';
  for(let i=0;i<=4;i++){const xx=w*i/4;ctx.beginPath();ctx.moveTo(xx,20);ctx.lineTo(xx,105);ctx.stroke();ctx.textAlign=i===0?'left':i===4?'right':'center';ctx.fillText(relativeTime(view.start+view.span*i/4),xx,122)}
  if(loading||error)return;
  if(picks.a!=null&&picks.b!=null){ctx.fillStyle='#f7c84b55';ctx.fillRect(x(Math.min(picks.a,picks.b)),18,Math.abs(picks.b-picks.a)/view.span*w,87)}
  let max=1;for(const d of data)for(const s of d.segments){const a=Math.max(0,Math.floor((view.start-s.start)/s.step)),b=Math.min(s.values.length,Math.ceil((view.start+view.span-s.start)/s.step));for(let i=a;i<b;i++)max=Math.max(max,Math.abs(s.values[i][0]),Math.abs(s.values[i][1]))}
  ctx.save();ctx.beginPath();ctx.rect(0,18,w,88);ctx.clip();ctx.strokeStyle=color;ctx.lineWidth=1;const y=(v:number)=>62-v/max*40*gain;
  for(const d of data)for(const s of d.segments){ctx.beginPath();const a=Math.max(0,Math.floor((view.start-s.start)/s.step)),b=Math.min(s.values.length,Math.ceil((view.start+view.span-s.start)/s.step));for(let i=a;i<b;i++){const xx=x(s.start+i*s.step),v=s.values[i];if(s.step<=.02){if(i===a)ctx.moveTo(xx,y(v[0]));else ctx.lineTo(xx,y(v[0]))}else{ctx.moveTo(xx,y(v[0]));ctx.lineTo(xx,Math.min(y(v[0])-.6,y(v[1])))}}ctx.stroke()}ctx.restore();
  for(const [key,col] of [['p','#2271a4'],['s','#cd5035']] as const){const t=picks[key];if(t==null)continue;const xx=x(t);ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(xx,18);ctx.lineTo(xx,106);ctx.stroke();ctx.fillStyle=col;ctx.fillRect(xx-10,0,20,19);ctx.fillStyle='white';ctx.textAlign='center';ctx.fillText(key.toUpperCase(),xx,13)}
  if(aiPicks)for(const key of ['p','s'] as const){const t=aiPicks[key].arrival_s;if(t===null)continue;const xx=x(t);ctx.save();ctx.strokeStyle='#d3a7ff';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(xx,20);ctx.lineTo(xx,107);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#d3a7ff';ctx.textAlign=xx>w-45?'right':'left';ctx.fillText('AI '+key.toUpperCase(),xx+3,104);ctx.restore()}
 },[data,view,picks,aiPicks,size,color,gain,loading,error]);
 function timeAt(clientX:number){const r=canvas.current!.getBoundingClientRect();return clamp(view.start+(clientX-r.left)/r.width*view.span,0,7200)}
 function finish(id:number){pointers.current.delete(id);drag.current=null;pinch.current=null;const c=canvas.current;if(c?.hasPointerCapture(id))c.releasePointerCapture(id)}
 return <><div className="invest-wave"><canvas ref={canvas} tabIndex={0} role="img" aria-label={`${code} waveform. Select P or S and click to pick. With this waveform focused, press P or S to mark the viewing centre.`}
 onPointerDown={e=>{if((locked&&tool!=='pan')||loading||error)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,e.clientX);
 if(pointers.current.size===2){const [a,b]=[...pointers.current.values()],r=e.currentTarget.getBoundingClientRect();pinch.current={distance:Math.max(1,Math.abs(a-b)),view:{...view},anchor:clamp(((a+b)/2-r.left)/r.width,0,1)};if(drag.current&&!locked)onPicks(drag.current.before);drag.current=null;return;}
 const t=timeAt(e.clientX),near=(['p','s'] as const).find(k=>picks[k]!=null&&Math.abs(picks[k]!-t)/view.span*e.currentTarget.clientWidth<13),kind=tool==='highlight'?(near||tool):tool;drag.current={kind,x:e.clientX,time:t,start:view.start,before:{...picks}};if(kind==='highlight')onPicks({...picks,a:t,b:t});else if(kind==='p'||kind==='s')onPicks({...picks,[kind]:t});}}
 onPointerMove={e=>{if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,e.clientX);const p=pinch.current;if(p&&pointers.current.size===2){const [a,b]=[...pointers.current.values()],span=clamp(p.view.span*p.distance/Math.max(1,Math.abs(a-b)),3,7200);onView({start:p.view.start+p.view.span*p.anchor-span*p.anchor,span});return}const d=drag.current;if(!d)return;const t=timeAt(e.clientX);if(d.kind==='pan')onView({start:d.start-(e.clientX-d.x)/e.currentTarget.clientWidth*view.span,span:view.span});else if(!locked&&d.kind==='highlight')onPicks({...picks,a:Math.min(t,d.time),b:Math.max(t,d.time)});else if(!locked)onPicks({...picks,[d.kind]:t});}}
 onPointerUp={e=>finish(e.pointerId)} onPointerCancel={e=>finish(e.pointerId)}
 onKeyDown={e=>{if(!locked&&!loading&&!error&&(e.key.toLowerCase()==='p'||e.key.toLowerCase()==='s')){e.preventDefault();onPicks({...picks,[e.key.toLowerCase()]:view.start+view.span/2});return}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();onView({start:view.start+view.span*(e.key==='ArrowLeft'?-.3:.3),span:view.span})}if(e.key==='+'||e.key==='=')onView({start:view.start+view.span/4,span:view.span/2});if(e.key==='-')onView({start:view.start-view.span/2,span:view.span*2})}}/>
 {loading&&<span className="wave-overlay" role="status">Loading this part of the recording…</span>}{error&&<span className="wave-overlay error" role="status">{error}<button onClick={()=>setRetry(n=>n+1)}>Retry recording</button></span>}{!loading&&!error&&data.some(d=>d.coverage<.99)&&<small className="wave-gap-warning">Gaps in data · blank areas are not quiet ground</small>}</div></>;
}
