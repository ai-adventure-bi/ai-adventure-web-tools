import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import {STLExporter} from '../vendor/STLExporter.js';
import {defaultDesign} from '../js/design.js';
import {buildV2,meshAudit} from '../js/geometry-v2.js';
const hash=g=>createHash('sha256').update(Buffer.from(g.attributes.position.array.buffer)).digest('hex');
const d=defaultDesign(),g=buildV2(d),h=hash(g),exp=new STLExporter();
const original=exp.parse(new THREE.Mesh(g),{binary:true});
d.material='vividRainbow';d.rainbowPhase=.719;d.paint.strokes=[{p:[15,30,0],size:4,color:'#ff0000'}];
const painted=buildV2(d);painted.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(painted.attributes.position.count*3).fill(.4),3));assert.equal(hash(painted),h);const out=exp.parse(new THREE.Mesh(painted),{binary:true});assert(Buffer.from(out.buffer).equals(Buffer.from(original.buffer)),'STL bytes unchanged by paint/material');assert.equal(out.byteLength,84+out.getUint32(80,true)*50);

console.log(JSON.stringify({geometryInvariant:true,STLBytesIdentical:true,triangles:out.getUint32(80,true),binaryBytes:out.byteLength},null,2));

const upright=g.clone().rotateX(Math.PI/2).translate(0,0,-g.boundingBox.min.y);upright.computeBoundingBox();assert(Math.abs(upright.boundingBox.min.z)<1e-5);assert(Math.abs(upright.boundingBox.max.z-(g.boundingBox.max.y-g.boundingBox.min.y))<1e-4);console.log('Print orientation: Z-up, tip at Z=0.');
