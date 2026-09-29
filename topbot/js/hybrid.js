import {massProperties} from './mesh-metrics.js';
import * as THREE from '../vendor/three.module.js';
import {radius} from './design.js';
export const hybridStyles={invertedShrine:'Inverted alien shrine',coiledTentacles:'Coiled tentacles',alienShell:'Alien shell',sunkenChalice:'Sunken chalice',orbitalRim:'Orbital rim',petalCrown:'Low petal crown'};
export const defaultHybrid=()=>({style:'invertedShrine',amount:1.4,repetition:6,twist:.7,printMode:'single'});
const TAU=Math.PI*2;
function rimRadius(d,a){const R=d.body.width/2;return R*(radius(d.body.shape,a-.03)+2*radius(d.body.shape,a)+radius(d.body.shape,a+.03))/4;}
function height(d,a,t){const h=d.hybrid,A=h.amount,phase=a*h.repetition+h.twist*t*3,envelope=Math.sin(Math.PI*t)**2;let relief=0;
 if(h.style==='invertedShrine')relief=A*(1.2*Math.exp(-(((t-.72)/.08)**2))+.8*Math.exp(-(((t-.4)/.07)**2))+Math.pow(Math.max(0,Math.cos(phase)),5)*envelope);
 if(h.style==='coiledTentacles')relief=A*2.1*Math.pow(.5+.5*Math.cos(phase+4*t),5)*envelope;
 if(h.style==='alienShell')relief=A*1.6*Math.pow(Math.abs(Math.cos(phase*.5)),6)*envelope;
 if(h.style==='sunkenChalice')relief=A*(2*Math.exp(-(((t-.75)/.11)**2))-.6*Math.exp(-(((t-.48)/.18)**2)))*envelope;
 if(h.style==='orbitalRim')relief=A*(1.5*Math.exp(-(((t-.82)/.065)**2))+Math.pow(.5+.5*Math.cos(a*h.repetition+h.twist*t),5)*envelope);
 if(h.style==='petalCrown')relief=A*2*Math.pow(.5+.5*Math.cos(phase),3)*envelope;
 return 8-4*t+relief;
}
// A low, solid flywheel carries supported relief and a proper central grip.
// Always one continuous mesh including its point and grip.
export function buildHybrid(d){
 const part='assembled';
 const N=192,K=36,positions=[],indices=[],rings=[];
 const vertex=(x,y,z)=>{positions.push(x,y,z);return positions.length/3-1;};
 const ring=fn=>{const ids=[];for(let i=0;i<N;i++)ids.push(vertex(...fn(i/N*TAU)));rings.push(ids);};
 const circular=(r,y)=>ring(a=>[r*Math.cos(a),y,r*Math.sin(a)]);
 const start=vertex(0,-6,0);
 circular(.6,-5.7);circular(4,0);
 for(let j=1;j<=K;j++){const t=j/K;ring(a=>{const rad=4.25+(Math.max(9,rimRadius(d,a))-.8-4.25)*t;return [Math.cos(a)*rad,0,Math.sin(a)*rad];});}
 ring(a=>{const rad=Math.max(9,rimRadius(d,a));return [Math.cos(a)*rad,.8,Math.sin(a)*rad];});
 ring(a=>{const rad=Math.max(9,rimRadius(d,a));return [Math.cos(a)*rad,3.3,Math.sin(a)*rad];});
 for(let j=K;j>=0;j--){const t=j/K;ring(a=>{const rad=4.3+(Math.max(9,rimRadius(d,a))-.4-4.3)*t;return [Math.cos(a)*rad,height(d,a,t),Math.sin(a)*rad];});}
 // Finger grip: 8.6 mm diameter at its root, at least 7.2 mm above it.
 const gripH=Math.max(14,Math.min(22,d.handle.height));
 for(let j=1;j<=24;j++){const t=j/24;ring(a=>{const r=(4.3-.7*Math.sin(Math.PI*t/2))*(1+.04*Math.cos(a*8));return [Math.cos(a)*r,8+gripH*t,Math.sin(a)*r];});}
 circular(3.3,8+gripH+.45);const end=vertex(0,8+gripH+.45,0);
 for(let i=0;i<N;i++)indices.push(start,rings[0][i],rings[0][(i+1)%N]);
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<N;i++){const a=rings[j][i],b=rings[j][(i+1)%N],c=rings[j+1][(i+1)%N],e=rings[j+1][i];indices.push(a,e,b,b,e,c);}
 for(let i=0;i<N;i++)indices.push(rings.at(-1)[i],end,rings.at(-1)[(i+1)%N]);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);if(d.safety.balanceCorrection){const p=g.attributes.position,weights=Array.from({length:p.count},(_,i)=>Math.max(0,Math.min(1,(Math.hypot(p.getX(i),p.getZ(i))-6)/(d.body.width/2-6))));for(let j=0;j<6;j++){const c=massProperties(g).centre;for(let i=0;i<p.count;i++){p.setX(i,p.getX(i)-c.x*1.5*weights[i]);p.setZ(i,p.getZ(i)-c.z*1.5*weights[i]);}}}g.computeVertexNormals();g.computeBoundingBox();g.userData={designV2:true,hybrid:true,part,bodyTop:8,gripHeight:gripH,nominalBodyThickness:3.3};return g;
}
