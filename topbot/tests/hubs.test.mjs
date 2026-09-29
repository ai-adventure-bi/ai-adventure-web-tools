import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {buildV2} from '../js/geometry-v2.js';
const s=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const code=s.slice(s.indexOf('const DEFAULT='),s.indexOf('const editor='))+s.slice(s.indexOf('function radialStyle('),s.indexOf('function checkNumbers('));
const {DEFAULT,hubs,hubRadius,buildGeometry,effectiveParams}=new Function('THREE','mergeGeometries','buildV2',code+';return {DEFAULT,hubs,hubRadius,buildGeometry,effectiveParams};')(THREE,mergeGeometries,buildV2);
let count=0;
for(const hubStyle of hubs)for(const hubHeight of [0,1,12])for(const hubTwist of [-10,10])for(const hubLobes of [3,16]){
 const p={...DEFAULT,complexity:100,hubStyle,hubHeight,hubDepth:8,hubTwist,hubLobes};
 for(let i=0;i<96;i++){const a=i/96*Math.PI*2,r=p.stemDiameter/2;assert(Math.abs(hubRadius(p,a,0)-r)<1e-8);assert(Math.abs(hubRadius(p,a,1)-r)<1e-8);assert(Math.abs((hubRadius(p,a,1e-5)-r)/1e-5)<.001);for(let j=0;j<=20;j++){const v=hubRadius(p,a,j/20);assert(v>=r&&v<=r+2.8);}}
 const g=buildGeometry(effectiveParams(p));assert(Array.from(g.attributes.position.array).every(Number.isFinite));g.computeBoundingBox();assert(g.boundingBox.max.y>g.boundingBox.min.y);g.dispose();count++;
}
console.log(`${count} hub boundary configurations passed: capped relief, smooth end joins and finite complete meshes.`);
