import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import * as experimental from '../js/experimental.js';
import {DEFAULT,validateRecipe} from '../js/recipe-validation.js';
import {massProperties} from '../js/mesh-metrics.js';
const s=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const code=s.slice(s.indexOf('function radialStyle('),s.indexOf('function familyLabel('));
const names=Object.keys(experimental),api=new Function('THREE','mergeGeometries',...names,code+';return {buildGeometry,effectiveParams};')(THREE,mergeGeometries,...names.map(n=>experimental[n]));
const make=p=>{const g=api.buildGeometry(api.effectiveParams(validateRecipe(p)));g.computeBoundingBox();return g;};
const base={...DEFAULT,bodyHeight:14,stemHeight:20,bodyCrownStyle:'none',bodyTheme:'none',topperStyle:'none'};
const plain=make(base),off=make({...base,experimentalEnabled:false,outlineStyle:'butterfly',alienStyle:'eyePetals',alienAmount:100});
assert.deepEqual(plain.attributes.position.array,off.attributes.position.array,'toggle off restores original generator exactly');
let count=0,maxOffset=0;
for(const outlineStyle of experimental.outlineNames)for(const alienStyle of experimental.alienNames){const p={...base,experimentalEnabled:true,outlineStyle,outlineAmount:85,alienStyle,alienAmount:80},g=make(p);assert(Array.from(g.attributes.position.array).every(Number.isFinite));assert(Math.abs(g.boundingBox.min.y+base.tipLength)<1e-5);assert(Math.abs(g.boundingBox.max.y-plain.boundingBox.max.y)<1e-5,'outline must not increase underside or stem height');const mass=massProperties(g);assert(mass.volume>0);const offset=Math.hypot(mass.centre.x,mass.centre.z);maxOffset=Math.max(offset,maxOffset);assert(offset<.05);g.dispose();count++;}
for(const handleStyle of experimental.classicHandles)for(const topperStyle of ['none','mushroom']){const p={...base,stemHeight:34,handleStyle,topperStyle},g=make(p);assert(Math.abs(g.boundingBox.max.y-(base.bodyHeight+base.hubHeight*.65+34))<1e-4);g.dispose();}
const outlined={...base,experimentalEnabled:true,outlineStyle:'butterfly'};const a=make({...outlined,rimStyle:'smooth'}),b=make({...outlined,rimStyle:'scalloped'});assert.notDeepEqual(a.attributes.position.array,b.attributes.position.array,'rim controls still modify outlines');
assert.throws(()=>validateRecipe({...base,toyType:'yoyo'}),/spinning tops only/);
const migrated=validateRecipe({...base,design:{body:{shape:'butterfly',width:56,height:12},handle:{shape:'castle',height:24},material:'white'}});assert(!migrated.design);assert.equal(migrated.experimentalEnabled,false);assert.equal(migrated.handleStyle,'castle');assert.equal(migrated.bodyHeight,12);
console.log(JSON.stringify({outlineFeatureCases:count,handlesAtMaxHeight:10,maxHorizontalOffsetMM:maxOffset,toggleOffExact:true,scallopingChangesOutline:true,yoyoRejected:true,legacyImport:true}));
