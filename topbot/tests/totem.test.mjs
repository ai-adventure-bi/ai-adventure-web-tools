import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {buildV2} from '../js/geometry-v2.js';
import {defaultDesign} from '../js/design.js';
import {defaultHybrid} from '../js/hybrid.js';
// Exercise the app's actual geometry functions without its browser renderer.
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const constants=source.slice(source.indexOf('const DEFAULT='),source.indexOf('const editor='));
const geometry=source.slice(source.indexOf('function radialStyle('),source.indexOf('function checkNumbers('));
const {DEFAULT,topperStyles,effectiveParams,buildGeometry}=new Function('THREE','mergeGeometries','buildV2',constants+geometry+';return {DEFAULT,topperStyles,effectiveParams,buildGeometry};')(THREE,mergeGeometries,buildV2);
let count=0;
for(const stemHeight of [8,25,34])for(const topperHeight of [14,24,34])for(const topperStyle of topperStyles){const p={...DEFAULT,stemHeight,topperHeight,topperStyle,complexity:100,bodyTheme:'none',bodyCrownStyle:'none'},q=effectiveParams(p);assert.equal(q.stemHeight,stemHeight);const g=buildGeometry(q);g.computeBoundingBox();assert(Math.abs(g.boundingBox.max.y-(q.bodyHeight+q.hubHeight+stemHeight))<1e-4,`${topperStyle}: must fit selected total height`);assert(Array.from(g.attributes.position.array).every(Number.isFinite));g.dispose();count++;}
const d=defaultDesign();d.body.shape='round';d.hybrid=defaultHybrid();const original=JSON.stringify(d),low=effectiveParams({...DEFAULT,design:d,complexity:0}),high=effectiveParams({...DEFAULT,design:d,complexity:100});assert.equal(JSON.stringify(d),original);assert.equal(low.design.hybrid.amount,0);assert.equal(high.design.hybrid.amount,d.hybrid.amount);assert.equal(low.design.handle.height,high.design.handle.height);
console.log(`${count} full-height totem combinations passed; complexity preserves stored design and grip height.`);
