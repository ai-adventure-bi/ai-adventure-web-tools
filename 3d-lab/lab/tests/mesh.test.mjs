import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import * as THREE from '../../vendor/three.module.js';
import {STLExporter} from '../../vendor/STLExporter.js';
import {editable,Brush,inspect,packObjects,unpackObjects} from '../mesh.js';
test('welds seams and detects a closed manifold cube',()=>{
 const report=inspect(editable(new THREE.BoxGeometry(20,20,20)));
 assert.equal(report.components,1);assert.equal(report.boundaryEdges,0);assert.equal(report.nonManifoldEdges,0);assert.deepEqual(report.dimensions,[20,20,20]);
});
test('reports open boundaries and disconnected components',()=>{
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0,10,0,0,11,0,0,10,1,0],3));
 const report=inspect(g);assert.equal(report.boundaryEdges,6);assert.equal(report.components,2);
});
test('all brushes change geometry, preserve finite coordinates and closed topology',()=>{
 for(const mode of ['pull','push','inflate','smooth','flatten']){
  const g=editable(new THREE.SphereGeometry(20,48,32)),before=g.attributes.position.array.slice(),brush=new Brush(g);const count=brush.apply(new THREE.Vector3(0,0,20),new THREE.Vector3(0,0,1),10,mode==='push'?-1:1,mode);brush.finish();
  assert.ok(count>0);assert.ok(g.attributes.position.array.every(Number.isFinite));assert.notDeepEqual(g.attributes.position.array,before);assert.equal(inspect(g).boundaryEdges,0);
 }
});
test('project round-trip keeps sculpted vertices, materials and transforms',()=>{
 const mesh=new THREE.Mesh(editable(new THREE.SphereGeometry(10,20,16)),new THREE.MeshStandardMaterial({color:0xabcdef}));mesh.name='Student sculpture';mesh.position.set(10,20,30);mesh.scale.set(1,2,3);mesh.rotation.set(.1,.2,.3);mesh.geometry.attributes.position.setZ(0,12);
 const loaded=unpackObjects(JSON.parse(JSON.stringify(packObjects([mesh]))))[0];
 assert.deepEqual(Array.from(loaded.geometry.attributes.position.array,n=>n||0),Array.from(mesh.geometry.attributes.position.array,n=>n||0));assert.deepEqual(loaded.position.toArray(),[10,20,30]);assert.deepEqual(loaded.scale.toArray(),[1,2,3]);assert.equal(loaded.material.color.getHex(),0xabcdef);
});
test('invalid indices and infinite transforms are rejected',()=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()),data=packObjects([mesh]);data.objects[0].indices[0]=999999;assert.throws(()=>unpackObjects(data));data.objects[0].indices[0]=0;data.objects[0].scale[0]=Infinity;assert.throws(()=>unpackObjects(data));
});
test('binary STL export contains transformed millimetre geometry',()=>{
 const scene=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(10,10,10));mesh.position.set(0,5,0);scene.add(mesh);scene.updateMatrixWorld(true);const stl=new STLExporter().parse(scene,{binary:true});assert.equal(stl.getUint32(80,true),12);assert.equal(stl.byteLength,684);
 const coords=[];for(let i=0;i<12;i++)for(let v=0;v<3;v++)coords.push(stl.getFloat32(84+i*50+12+v*12+4,true));assert.equal(Math.min(...coords),0);assert.equal(Math.max(...coords),10);
});
test('75k-triangle mesh: brush, scene round-trip and STL export',t=>{
 const g=editable(new THREE.SphereGeometry(50,250,151));assert.equal(g.index.count/3,75000);
 const start=performance.now(),brush=new Brush(g),prepared=performance.now();for(let i=0;i<10;i++)brush.apply(new THREE.Vector3(0,0,50),new THREE.Vector3(0,0,1),10,.25,'inflate');brush.finish();const edited=performance.now();
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial()),scene=new THREE.Group();scene.add(m);scene.updateMatrixWorld(true);const stl=new STLExporter().parse(scene,{binary:true});assert.equal(stl.byteLength,3750084);const restored=unpackObjects(packObjects([m]));assert.equal(restored[0].geometry.index.count,225000);
 t.diagnostic(`Host CPU: ${Math.round(prepared-start)}ms brush preparation; ${Math.round(edited-prepared)}ms for 10 brush samples plus normals/grid update. Not an iPad benchmark.`);
});
