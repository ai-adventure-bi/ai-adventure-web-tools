import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';import {editable,Brush} from '../mesh.js';
function nearest(g,target){const p=g.attributes.position;let best=Infinity,index=0;for(let i=0;i<p.count;i++){const d=new THREE.Vector3().fromBufferAttribute(p,i).distanceToSquared(target);if(d<best){best=d;index=i;}}return index;}
test('front-only brush does not affect the rear of a thin surface',()=>{
 const g=editable(new THREE.BoxGeometry(20,20,1,10,10,1)),before=g.attributes.position.array.slice(),brush=new Brush(g),center=new THREE.Vector3(0,0,.5);
 brush.apply(center,new THREE.Vector3(0,0,1),6,.5,'pull',{seedIndex:nearest(g,center),frontOnly:true});
 let changed=0;for(let i=0;i<g.attributes.position.count;i++){if(before[i*3+2]===-.5)assert.equal(g.attributes.position.getZ(i),-.5);if(g.attributes.position.getZ(i)!==before[i*3+2])changed++;}assert.ok(changed>0);
});
test('brush seed confines edits to one disconnected surface',()=>{
 const a=editable(new THREE.PlaneGeometry(10,10,10,10)),b=a.clone();b.translate(0,0,.2);
 const positions=[...a.attributes.position.array,...b.attributes.position.array],offset=a.attributes.position.count;
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex([...a.index.array,...Array.from(b.index.array,i=>i+offset)]);g.computeVertexNormals();
 new Brush(g).apply(new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,1),4,.5,'pull',{seedIndex:nearest(a,new THREE.Vector3()),frontOnly:true});
 for(let i=offset;i<g.attributes.position.count;i++)assert.ok(Math.abs(g.attributes.position.getZ(i)-.2)<1e-6);
});
test('world-space radius and displacement stay consistent after non-uniform scaling',()=>{
 const g=editable(new THREE.PlaneGeometry(20,20,20,20)),matrix=new THREE.Matrix4().makeScale(2,1,3),before=g.attributes.position.array.slice();
 new Brush(g).apply(new THREE.Vector3(),new THREE.Vector3(0,0,1),3,.2,'pull',{seedIndex:nearest(g,new THREE.Vector3()),matrixWorld:matrix,frontOnly:true});
 for(let i=0;i<g.attributes.position.count;i++){const x=before[i*3]*2,y=before[i*3+1];if(Math.hypot(x,y)>=3)assert.equal(g.attributes.position.getZ(i),0);}
 const center=nearest(g,new THREE.Vector3());const moved=g.attributes.position.getZ(center)*3;assert.ok(moved>0&&moved<=.2);const worldGeometry=editable(new THREE.PlaneGeometry(40,20,20,20));new Brush(worldGeometry).apply(new THREE.Vector3(),new THREE.Vector3(0,0,1),3,.2,'pull',{seedIndex:nearest(worldGeometry,new THREE.Vector3()),frontOnly:true});assert.ok(Math.abs(moved-worldGeometry.attributes.position.getZ(nearest(worldGeometry,new THREE.Vector3())))<1e-6);
});
test('flatten responds to strength and shrink moves inward',()=>{
 const a=editable(new THREE.SphereGeometry(10,32,24)),b=a.clone(),center=new THREE.Vector3(0,0,10),normal=new THREE.Vector3(0,0,1),seed=nearest(a,center);
 const options={seedIndex:seed,frontOnly:true,planeCenter:new THREE.Vector3(0,0,9),planeNormal:normal};new Brush(a).apply(center,normal,5,.2,'flatten',options);new Brush(b).apply(center,normal,5,1,'flatten',options);assert.ok(b.attributes.position.getZ(seed)<a.attributes.position.getZ(seed));
 const c=editable(new THREE.SphereGeometry(10,32,24)),before=c.attributes.position.getZ(seed);new Brush(c).apply(center,normal,5,.5,'deflate',options);assert.ok(c.attributes.position.getZ(seed)<before);
});

test('repeated strong inward strokes on a thin shell retain the rear surface and finite triangles',()=>{const g=editable(new THREE.BoxGeometry(20,20,1,20,20,1)),brush=new Brush(g),seed=nearest(g,new THREE.Vector3(0,0,.5));for(let step=0;step<100;step++){g.computeVertexNormals();const center=new THREE.Vector3().fromBufferAttribute(g.attributes.position,seed);brush.apply(center,new THREE.Vector3(0,0,1),5,2,'push',{seedIndex:seed,frontOnly:true});}assert.ok(g.attributes.position.getZ(seed)>-.5);assert.ok(g.attributes.position.array.every(Number.isFinite));});

test('surface smoothing reduces a bump while retaining the overall sphere size',()=>{const g=editable(new THREE.SphereGeometry(20,48,32)),seed=nearest(g,new THREE.Vector3(0,0,20));g.attributes.position.setZ(seed,22);g.computeVertexNormals();const brush=new Brush(g);for(let step=0;step<25;step++){brush.apply(new THREE.Vector3(0,0,20),new THREE.Vector3(0,0,1),8,.5,'smooth',{seedIndex:seed,frontOnly:true});g.computeVertexNormals();}g.computeBoundingBox();assert.ok(g.attributes.position.getZ(seed)<21.5);assert.ok(g.boundingBox.max.z>19.5);assert.ok(Math.abs(g.boundingBox.max.x-20)<.001);assert.ok(Math.abs(g.boundingBox.min.z+20)<.001);});

test('maximum brush strength moves the surface more while keeping finite geometry',()=>{for(const mode of ['pull','push','inflate','deflate','flatten']){const source=editable(new THREE.SphereGeometry(20,48,32)),center=new THREE.Vector3(0,0,20),normal=new THREE.Vector3(0,0,1),displacement=strength=>{const g=source.clone(),before=g.attributes.position.array.slice(),brush=new Brush(g);brush.apply(center,normal,6,strength,mode,{seedIndex:nearest(g,center),frontOnly:true});let largest=0;for(let i=0;i<before.length;i+=3){const distance=Math.hypot(g.attributes.position.array[i]-before[i],g.attributes.position.array[i+1]-before[i+1],g.attributes.position.array[i+2]-before[i+2]);assert.ok(Number.isFinite(distance));largest=Math.max(largest,distance);}return largest;};assert.ok(displacement(2)>displacement(.6)*1.15,mode);}});
