import model from './seismic-model.json';
export type Point={lat:number;lon:number};
export type Picks={a?:number;b?:number;p?:number;s?:number};
export const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
export function distanceKm(a:Point,b:Point){const r=Math.PI/180,h=Math.sin((a.lat-b.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((a.lon-b.lon)*r/2)**2;return model.earthDiameterKm*Math.asin(Math.sqrt(clamp(h,0,1)))}
export function ringKm(p:Picks){if(p.p==null||p.s==null||p.s<=p.p||p.s-p.p>model.maxDelaySeconds)return null;return (p.s-p.p)/(1/model.sVelocityKmS-1/model.pVelocityKmS)}
export function relativeTime(t:number){const n=Math.round(t*10),minutes=Math.floor(n/600);return `${String(minutes).padStart(2,'0')}:${((n-minutes*600)/10).toFixed(1).padStart(4,'0')}`}
export function pointsFor(error:number){return Math.max(0,Math.round(1000*Math.exp(-Math.max(0,error)/60)))}
export function overlap(p:Picks,arrival:number){if(p.a==null||p.b==null)return null;const lo=Math.min(p.a,p.b),hi=Math.max(p.a,p.b),a=arrival-1,b=arrival+25;return Math.round(100*Math.max(0,Math.min(hi,b)-Math.max(lo,a))/(Math.max(hi,b)-Math.min(lo,a)))}
