import assert from 'node:assert/strict';
import {defaultDesign,validateDesign} from '../js/design.js';
import {buildHybrid,defaultHybrid,hybridStyles} from '../js/hybrid.js';
import {meshAudit,buildV2} from '../js/geometry-v2.js';

import * as THREE from '../vendor/three.module.js';
import {STLExporter} from '../vendor/STLExporter.js';
function components(g){const parent=Int32Array.from({length:g.attributes.position.count},(_,i)=>i),root=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;},ix=g.index.array;for(let i=0;i<ix.length;i+=3){parent[root(ix[i+1])]=root(ix[i]);parent[root(ix[i+2])]=root(ix[i]);}return new Set(Array.from(parent,(_,i)=>root(i))).size;}
let count=0,maxY=0,maxXY=0;
for(const style of Object.keys(hybridStyles))for(const shape of ['round','flower','starfish','octopus','gear','sun','snowflake','amoeba','spiral','shell'])for(const extreme of [false,true]){const d=defaultDesign();d.body.shape=shape;d.body.width=extreme?44:64;d.handle.height=extreme?22:14;d.hybrid={...defaultHybrid(),style,amount:extreme?2:.5,repetition:extreme?5:12,twist:extreme?1:-1};validateDesign(d);for(const part of ['assembled']){const g=buildHybrid(d,part),a=meshAudit(g),xy=Math.hypot(a.centre.x,a.centre.z);assert.equal(components(g),1);assert.equal(a.badEdges,0);assert.equal(a.degenerate,0);assert(a.volume>0);assert(a.centre.y<8,'centre of mass below handle base');assert(xy<.01,'horizontal correction');assert.equal(g.boundingBox.min.y,part==='body'?0:-6);maxY=Math.max(maxY,a.centre.y);maxXY=Math.max(maxXY,xy);g.dispose();count++;}}
const d=defaultDesign();d.body.shape='round';d.body.width=56;d.handle.height=18;d.hybrid=defaultHybrid();const before=buildV2(d),exporter=new STLExporter();d.material='vividRainbow';d.rainbowPhase=.71;d.paint.strokes=[{p:[12,5,0],size:3,color:'#ff0000'}];const after=buildV2(d);assert.deepEqual(before.attributes.position.array,after.attributes.position.array);assert.deepEqual(exporter.parse(new THREE.Mesh(before),{binary:true}),exporter.parse(new THREE.Mesh(after),{binary:true}));

console.log(JSON.stringify({hybridMeshCases:count,maxY,maxXY,paintAndMaterialInvariant:true}));
