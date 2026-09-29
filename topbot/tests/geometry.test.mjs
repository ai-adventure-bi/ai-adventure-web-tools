import assert from 'node:assert/strict';
import {defaultDesign,validateDesign,shapes,handleShapes} from '../js/design.js';
import {buildV2,meshAudit} from '../js/geometry-v2.js';
let count=0,maxOffset=0;
for(const shape of Object.keys(shapes))for(const handle of handleShapes){
 const d=defaultDesign();d.body.shape=shape;d.handle.shape=handle;validateDesign(d);
 const g=buildV2(d),audit=meshAudit(g),offset=Math.hypot(audit.centre.x,audit.centre.z);
 assert.equal(audit.badEdges,0,`${shape}/${handle}: open or misoriented edges`);assert.equal(audit.degenerate,0,`${shape}/${handle}: degenerate faces`);assert(audit.volume>0,`${shape}/${handle}: positive volume`);assert(offset<.15,`${shape}/${handle}: residual balance ${offset}`);assert([...g.attributes.position.array].every(Number.isFinite));maxOffset=Math.max(maxOffset,offset);g.dispose();count++;
}
for(let i=0;i<40;i++){const d=defaultDesign();d.body.shape=Object.keys(shapes)[i%Object.keys(shapes).length];d.body.width=i%2?30:65;d.body.stretch=i%2?.7:1.3;d.body.asymmetry=i%2?-.3:.3;d.body.twist=i%2?-1:1;d.surface.texture='seeds';d.surface.depth=1.2;d.surface.relief='engrave';d.edge.style='waves';d.edge.amount=2;d.attachments=[{shape:'leaf',position:{x:.35,z:.1},scale:8,rotation:45,repeat:3},{shape:'tentacle',position:{x:0,z:0},scale:10,rotation:0,repeat:1}];const g=buildV2(validateDesign(d)),a=meshAudit(g);assert.equal(a.badEdges,0);assert.equal(a.degenerate,0);assert(a.volume>0);assert(g.userData.minimumBodyThickness>=2.4);g.dispose();count++;}
const bad=defaultDesign();bad.body.width=Infinity;assert.throws(()=>validateDesign(bad));const empty=defaultDesign();empty.paint.strokes=[{p:[NaN,0,0],size:3,color:'#ff0000'}];assert.throws(()=>validateDesign(empty));
console.log(JSON.stringify({passed:count,maxBalanceOffsetMM:maxOffset,checks:'closed oriented mesh, nondegenerate faces, positive volume, finite coordinates, balance, minimum body thickness, schema rejection'},null,2));
