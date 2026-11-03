import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.js';
import {Workshop} from '../workshop.js';import {editable,inspect} from '../mesh.js';
function harness(){
 const w=Object.create(Workshop.prototype);Object.assign(w,{objects:[],past:[],future:[],revision:0,brushes:new WeakMap(),group:new THREE.Group(),cursor:{visible:false},touches:new Map(),mode:'orbit',radius:6,strength:.6,host:{clientHeight:600},renderer:{domElement:{focus(){},setPointerCapture(){}}},transform:{detach(){}}});
 w.render=()=>{};w.changed=()=>{};w.updateControls=()=>{};
 for(let i=0;i<2;i++){const m=new THREE.Mesh(editable(new THREE.SphereGeometry(14,32,24)),new THREE.MeshStandardMaterial());m.name=`Shape ${i}`;m.position.x=i*40;w.objects.push(m);w.group.add(m);}w.selected=w.objects[1];w.group.updateMatrixWorld(true);return w;
}
test('a complete brush stroke is one undo step and redo preserves selection',()=>{
 const w=harness();w.mode='pull';const mesh=w.selected,initial=Array.from(mesh.geometry.attributes.position.array),worldPoint=new THREE.Vector3(0,0,14).applyMatrix4(mesh.matrixWorld);
 let seed=0,best=Infinity;for(let i=0;i<mesh.geometry.attributes.position.count;i++){const d=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).distanceToSquared(new THREE.Vector3(0,0,14));if(d<best){best=d;seed=i;}}
 w.hit=()=>({object:mesh,point:worldPoint,face:{a:seed,normal:new THREE.Vector3(0,0,1)}});w.showCursor=()=>{};
 const e={button:0,pointerId:1,pointerType:'mouse',clientX:200,clientY:200,preventDefault(){},stopImmediatePropagation(){}};
 w.down(e);w.paint(w.hit(),e);w.paint(w.hit(),e);w.up(e);assert.equal(w.past.length,1);assert.equal(w.selected,mesh);
 const sculpted=Array.from(mesh.geometry.attributes.position.array);assert.notDeepEqual(sculpted,initial);w.undo();assert.deepEqual(Array.from(w.selected.geometry.attributes.position.array),initial);assert.equal(w.selected.name,'Shape 1');w.redo();assert.deepEqual(Array.from(w.selected.geometry.attributes.position.array),sculpted);
});
test('Escape-style cancellation restores the stroke without consuming history or redo',()=>{
 const w=harness();w.mode='pull';const mesh=w.selected,before=w.serialize();w.strokeBefore=before;w.strokeFuture=[before];w.strokeMesh=mesh;w.stroke=true;w.strokeChanged=true;w.remember(before);mesh.geometry.attributes.position.setZ(0,99);w.cancelStroke();assert.deepEqual(w.serialize(),before);assert.equal(w.past.length,0);assert.equal(w.future.length,1);
});
test('second touch ends the stroke and remaining fingers do not start another',()=>{
 const w=harness();w.mode='pull';let finished=0;w.stroke=true;w.strokePointer=1;w.strokeMesh=w.selected;w.brushes.set(w.selected,{finish(){finished++;}});w.touches.set(1,[100,100]);
 const e={button:0,pointerType:'touch',pointerId:2,clientX:140,clientY:100,preventDefault(){},stopImmediatePropagation(){}};
 w.down(e);assert.equal(finished,1);assert.equal(w.stroke,false);assert.equal(w.touchNavigation,true);w.up(e);assert.equal(w.touchNavigation,true);w.up({...e,pointerId:1});assert.equal(w.touchNavigation,false);assert.equal(w.touches.size,0);
});
