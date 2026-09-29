import assert from 'node:assert/strict';
import {DEFAULT,validateRecipe,topperStyles} from '../js/recipe-validation.js';
import {forms,buildThemeGeometry,themeSolid} from '../js/themes.js';
import {meshAudit} from '../js/geometry-v2.js';
import * as THREE from '../vendor/three.module.js';
import {STLExporter} from '../vendor/STLExporter.js';
function auditSTL(g){const data=new STLExporter().parse(new THREE.Mesh(g),{binary:true}),count=data.getUint32(80,true),positions=[],ix=[],map=new Map();assert.equal(data.byteLength,84+50*count);for(let i=0;i<count;i++)for(let j=0;j<3;j++){const q=[0,1,2].map(k=>data.getFloat32(84+i*50+12+j*12+k*4,true));assert(q.every(Number.isFinite));const key=q.join(',');if(!map.has(key)){map.set(key,positions.length/3);positions.push(...q);}ix.push(map.get(key));}const r=new THREE.BufferGeometry();r.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));r.setIndex(ix);const a=meshAudit(r);r.dispose();return a;}
let cases=0,maxOffset=0,maxMS=0;
for(const [theme,names] of Object.entries(forms))for(const form of names){
 for(let k=0;k<3;k++){
 const p=validateRecipe({...DEFAULT,theme,form,...(k===1?{bodyDiameter:25,bodyHeight:8,stemDiameter:5,stemHeight:8,tipLength:3,radialScale:.7,radialCount:5,structureGap:.65,structureWall:2.8,structureTwist:-1,structureLayers:2}:k===2?{bodyDiameter:65,bodyHeight:30,stemDiameter:12,tipLength:12,radialScale:1.3,radialCount:11,structureGap:1.35,structureWall:5,structureTwist:1,structureLayers:4}:{})});
 const started=performance.now(),g=buildThemeGeometry(p),a=meshAudit(g),offset=Math.hypot(a.centre.x,a.centre.z);maxMS=Math.max(maxMS,performance.now()-started);maxOffset=Math.max(offset,maxOffset);
 assert.equal(a.badEdges,0,`${form}/${k}: watertight oriented mesh`);assert.equal(a.degenerate,0,`${form}/${k}: no zero area faces`);assert(a.volume>0);assert(offset<.08,`${form}/${k}: balance ${offset}`);
 const ix=g.index.array,parent=Int32Array.from({length:g.attributes.position.count},(_,i)=>i),root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};for(let i=0;i<ix.length;i+=3){parent[root(ix[i+1])]=root(ix[i]);parent[root(ix[i+2])]=root(ix[i]);}assert.equal(new Set([...parent].map((_,i)=>root(i))).size,1,`${form}: connected`);
 const {tipRadius}=themeSolid(p);assert.equal(tipRadius(0),p.stemDiameter*.43);assert(Math.abs(tipRadius(-p.tipLength+.7)-p.stemDiameter*.12)<1e-6);
 if(k===0){const stl=auditSTL(g);assert.equal(stl.badEdges,0,`${form}: STL edge welding`);assert.equal(stl.degenerate,0);}
 g.dispose();cases++;
 }console.log(form+': default + small/large extremes passed');
}
for(const topperStyle of topperStyles){const p=validateRecipe({...DEFAULT,theme:'galactic',form:'orbital',topperStyle});const g=buildThemeGeometry(p),a=meshAudit(g);assert.equal(a.badEdges,0,topperStyle);assert.equal(a.degenerate,0,topperStyle);assert(Math.hypot(a.centre.x,a.centre.z)<.08,topperStyle+' balance');g.dispose();cases++;}
console.log(JSON.stringify({cases,maxOffset,maxMS,STL:'all 10 forms checked after binary serialization'},null,2));
