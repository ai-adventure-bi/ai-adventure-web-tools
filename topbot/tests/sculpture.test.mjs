import assert from 'node:assert/strict';
import {buildSculpture,sculptures,defaultSculpture} from '../js/sculpture.js';
import {meshAudit,buildV2} from '../js/geometry-v2.js';
import {defaultDesign,validateDesign} from '../js/design.js';
import * as THREE from '../vendor/three.module.js';
import {STLExporter} from '../vendor/STLExporter.js';
function connected(g){const p=Int32Array.from({length:g.attributes.position.count},(_,i)=>i),root=x=>{while(p[x]!==x){p[x]=p[p[x]];x=p[x];}return x;},ix=g.index.array;for(let i=0;i<ix.length;i+=3){p[root(ix[i+1])]=root(ix[i]);p[root(ix[i+2])]=root(ix[i]);}return new Set(Array.from(p,(_,i)=>root(i))).size;}
let count=0,maxBalance=0,maxTime=0;
for(const family of Object.keys(sculptures)){
 const variants=[{...defaultSculpture(),family},...Array.from({length:8},(_,k)=>({family,width:k&1?64:42,height:k&2?60:38,arms:k%3===0?3:k%3===1?5:8,twist:k&4?1.3:-1.3,flare:k&1?1:.3,wall:k&2?4.5:2.8}))];
 for(const sculpture of variants){const t=performance.now(),design=validateDesign({...defaultDesign(),sculpture}),g=buildV2(design),a=meshAudit(g),balance=Math.hypot(a.centre.x,a.centre.z);maxTime=Math.max(maxTime,performance.now()-t);assert.equal(connected(g),1,family+' connected');assert.equal(a.badEdges,0,family+' closed and oriented');assert.equal(a.degenerate,0,family+' no collapsed triangles');assert(a.volume>0);assert(balance<.2,family+' balance '+balance);maxBalance=Math.max(maxBalance,balance);const p=g.attributes.position;let lowest=0;for(let i=1;i<p.count;i++)if(p.getY(i)<p.getY(lowest))lowest=i;assert(Math.hypot(p.getX(lowest),p.getZ(lowest))<1.2,family+' point must be lowest');g.dispose();count++;}
 console.log(family+': 9 variants passed');
}
const d={...defaultDesign(),sculpture:defaultSculpture()},before=buildV2(d);d.material='vividRainbow';d.rainbowPhase=.72;d.paint.strokes=[{p:[0,20,0],size:4,color:'#ff0000'}];const after=buildV2(d),exporter=new STLExporter();assert.deepEqual(before.attributes.position.array,after.attributes.position.array);assert.deepEqual(exporter.parse(new THREE.Mesh(before),{binary:true}),exporter.parse(new THREE.Mesh(after),{binary:true}));
assert.throws(()=>validateDesign({...defaultDesign(),sculpture:{...defaultSculpture(),arms:2}}));
console.log(JSON.stringify({passed:count,maxBalanceOffsetMM:maxBalance,maxGenerationAndAuditMS:Math.round(maxTime),paintAndMaterialLeaveSTLUnchanged:true},null,2));
