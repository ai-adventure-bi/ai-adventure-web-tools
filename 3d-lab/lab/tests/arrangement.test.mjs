import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from '../../vendor/three.module.js';
import {applyPivotDelta} from '../on-object.js';import {Workshop} from '../workshop.js';import {packObjects,unpackObjects} from '../mesh.js';
test('on-object uniform resize keeps an offset mesh’s visual centre fixed',()=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(10,20,10).translate(0,10,0));const group=new THREE.Group();group.add(mesh);mesh.position.set(30,0,0);group.updateMatrixWorld(true);
 const before=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()),pivot=new THREE.Matrix4().makeTranslation(...before.toArray()),now=pivot.clone().multiply(new THREE.Matrix4().makeScale(2,2,2));applyPivotDelta(mesh,pivot,now,mesh.matrixWorld.clone());
 const box=new THREE.Box3().setFromObject(mesh);assert.ok(box.getCenter(new THREE.Vector3()).distanceTo(before)<1e-6);assert.ok(Math.abs(box.getSize(new THREE.Vector3()).y-40)<1e-6);
});
test('on-object movement respects a transformed parent and supports lift-only movement',()=>{
 const parent=new THREE.Group();parent.position.set(10,3,4);parent.rotation.y=.4;const mesh=new THREE.Mesh(new THREE.BoxGeometry());parent.add(mesh);parent.updateMatrixWorld(true);const original=mesh.matrixWorld.clone(),pivot=new THREE.Matrix4().makeTranslation(10,3,4),now=new THREE.Matrix4().makeTranslation(10,15,4);applyPivotDelta(mesh,pivot,now,original);const world=mesh.getWorldPosition(new THREE.Vector3());assert.ok(world.distanceTo(new THREE.Vector3(10,15,4))<1e-6);
});
test('switching tools restores the last brush without losing selection',()=>{
 const w=Object.create(Workshop.prototype);Object.assign(w,{workspace:'sculpt',mode:'orbit',lastBrush:'smooth',objects:[{name:'Shape'}],selected:null,touches:new Map(),arrangeMode:'translate'});w.endStroke=()=>{};w.updateControls=()=>{};w.changed=()=>{};
 w.setWorkspace('sculpt');assert.equal(w.mode,'smooth');assert.equal(w.selected,w.objects[0]);w.setWorkspace('arrange');assert.equal(w.mode,'orbit');w.setWorkspace('add');w.setWorkspace('sculpt');assert.equal(w.mode,'smooth');assert.equal(w.selected,w.objects[0]);assert.equal(w.navHeld,false);
});
test('clicking empty space deselects the object and clears its controls',()=>{
 const w=Object.create(Workshop.prototype),selected={};Object.assign(w,{mode:'orbit',selected,startPoint:{x:10,y:10},transform:{axis:null}});w.hit=()=>undefined;w.select=m=>{w.selected=m;};w.up({clientX:11,clientY:10});assert.equal(w.selected,null);
});
test('visibility survives editable project save/reopen without removing geometry',()=>{
 const a=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()),b=a.clone();b.visible=false;const restored=unpackObjects(packObjects([a,b]));assert.equal(restored.length,2);assert.equal(restored[0].visible,true);assert.equal(restored[1].visible,false);
});
