import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import {STLExporter} from '../../vendor/STLExporter.js';
import {importModelFile} from '../model-import.js';
import {unpackObjects,packObjects,inspect} from '../mesh.js';
const file=(name,data)=>{const blob=new Blob([data]);return {name,size:blob.size,arrayBuffer:()=>blob.arrayBuffer(),text:()=>blob.text()};};
test('STL upload round-trips millimetres and remains exportable after editing',async()=>{
 const original=new THREE.Mesh(new THREE.BoxGeometry(20,30,40));original.updateMatrixWorld();const data=new STLExporter().parse(original,{binary:true});
 const project=await importModelFile(file('cube.stl',data)),meshes=unpackObjects(project);const box=new THREE.Box3().setFromObject(meshes[0]);assert.deepEqual(box.getSize(new THREE.Vector3()).toArray(),[20,30,40]);assert.equal(box.min.y,0);
 meshes[0].geometry.scale(2,1,1);meshes[0].updateMatrixWorld();const edited=new STLExporter().parse(meshes[0],{binary:true});const reopened=unpackObjects(await importModelFile(file('edited.stl',edited)));assert.equal(new THREE.Box3().setFromObject(reopened[0]).getSize(new THREE.Vector3()).x,40);
});
test('OBJ accepts multiple objects and ignores external material references without fetching',async()=>{
 const previous=globalThis.fetch;let requests=0;globalThis.fetch=async()=>{requests++;throw Error('Unexpected request');};try{const project=await importModelFile(file('shapes.obj','mtllib https://example.test/private.mtl\no first\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\no second\nv 0 0 1\nv 1 0 1\nv 0 1 1\nf 4 5 6'));assert.equal(project.objects.length,2);assert.equal(requests,0);}finally{globalThis.fetch=previous;}
});
test('unsupported, invalid, empty and oversized imports fail before changing the editor',async()=>{
 await assert.rejects(importModelFile(file('mesh.fbx','x')),/STL, OBJ, GLB/);await assert.rejects(importModelFile(file('empty.obj','o Empty')),/No triangle/);await assert.rejects(importModelFile(file('bad.glb','invalid')),/valid GLB/);await assert.rejects(importModelFile({name:'large.stl',size:51*1024*1024}),/50 MB/);await assert.rejects(importModelFile(file('bad.json','{"format":"nope"}')),/3D Lab/);
});
test('dense STL is simplified below the editor limit, with a closed surface and matching bounds',async()=>{
 const original=new THREE.Mesh(new THREE.TorusKnotGeometry(30,9,700,128));original.updateMatrixWorld();const data=new STLExporter().parse(original,{binary:true}),progress=[];
 const project=await importModelFile(file('dense.stl',data),{onProgress:message=>progress.push(message)});
 assert.equal(project.importSummary.originalTriangles,179200);assert.ok(project.importSummary.triangles<=150000);assert.ok(project.importSummary.triangles>100000);assert.ok(progress.some(p=>p.startsWith('Simplifying')));
 const mesh=unpackObjects(project)[0],metrics=inspect(mesh.geometry);assert.equal(metrics.boundaryEdges,0);assert.equal(metrics.nonManifoldEdges,0);assert.equal(metrics.components,1);
 const before=new THREE.Box3().setFromObject(original).getSize(new THREE.Vector3()),after=new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());for(let i=0;i<3;i++)assert.ok(Math.abs(before.getComponent(i)-after.getComponent(i))<1);
 mesh.geometry.dispose();mesh.material.dispose();original.geometry.dispose();original.material.dispose();
});
test('oversized editable project is reduced while preserving separate objects and their placement',async()=>{
 const dense=new THREE.Mesh(new THREE.TorusKnotGeometry(30,9,700,128)),box=new THREE.Mesh(new THREE.BoxGeometry(10,20,30));dense.name='Detailed sculpture';dense.position.x=35;box.name='Separate piece';box.position.set(120,20,0);const input=packObjects([dense,box]);
 const result=await importModelFile(file('dense-project.json',JSON.stringify(input)));assert.equal(result.objects.length,2);assert.equal(result.objects[1].name,'Separate piece');assert.ok(result.importSummary.triangles<=150000);
 const meshes=unpackObjects(result),bounds=new THREE.Box3().setFromObject(meshes[1]);assert.ok(Math.abs(bounds.min.x-115)<.001);assert.ok(Math.abs(bounds.max.y-30)<.001);
});
test('meshes above the processing ceiling are rejected before loading geometry',async()=>{
 const header=new ArrayBuffer(84+50*1000001);new DataView(header).setUint32(80,1000001,true);await assert.rejects(importModelFile(file('too-dense.stl',header)),/1,000,000-triangle/);
});
