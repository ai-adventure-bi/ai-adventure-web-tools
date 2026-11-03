import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from '../../vendor/three.module.js';import {Workshop} from '../workshop.js';
function fixture(){
 const positions=new Float32Array([0,0,0,1,0,0,0,1,0]);const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],buffers:[{byteLength:positions.byteLength}],bufferViews:[{buffer:0,byteOffset:0,byteLength:positions.byteLength}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}]};
 let text=JSON.stringify(doc);while(text.length%4)text+=' ';const json=Buffer.from(text),bin=Buffer.from(positions.buffer),out=Buffer.alloc(12+8+json.length+8+bin.length);out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);out.writeUInt32LE(bin.length,20+json.length);out.writeUInt32LE(0x004e4942,24+json.length);bin.copy(out,28+json.length);return out;
}
test('real GLTFLoader imports a self-contained GLB into editable geometry',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response(fixture());
 try{const workshop={group:new THREE.Group(),objects:[],checkpoint(){},clear(){this.group.clear();this.objects=[];},select(m){this.selected=m;},fit(){},changed(){}};
  await Workshop.prototype.importGLB.call(workshop,'https://fixture.test/model.glb');assert.equal(workshop.objects.length,1);const m=workshop.objects[0];m.geometry.computeBoundingBox();assert.equal(m.geometry.boundingBox.max.y,100);assert.equal(m.geometry.boundingBox.min.y,0);assert.ok(m.geometry.attributes.normal);assert.equal(m.geometry.index.count,3);
 }finally{globalThis.fetch=original;}
});
