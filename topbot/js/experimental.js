import {shapes,radius} from './design.js';
import {massProperties} from './mesh-metrics.js';
export const outlineNames=Object.keys(shapes);
export const alienNames=['none','orbitalWaves','coiledRibs','eyePetals'];
export const classicHandles=['lighthouse','strawberry','castle','crystal','pawn'];
export function validateExperimental(p){
 if(typeof p.experimentalEnabled!=='boolean')throw Error('Experimental designs must be on or off.');
 if(!outlineNames.includes(p.outlineStyle))throw Error('Unknown experimental outline.');
 if(!alienNames.includes(p.alienStyle))throw Error('Unknown experimental surface feature.');
 for(const k of ['outlineAmount','alienAmount'])if(!Number.isFinite(p[k])||p[k]<0||p[k]>100)throw Error(`${k} must be between 0 and 100.`);
}
export function upgradeRecipe(raw,defaults){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Expected a spinning-top recipe.');
 if(raw.toyType&&raw.toyType!=='top')throw Error('This edition opens spinning tops only. Yo-yos have been removed.');
 const old=raw.design||(raw.version===2&&raw.body?raw:null),p={...defaults,...(raw.version===2?{}:raw),toyType:'top'};
 if(old){const f=old.hybrid?.style||old.sculpture?.family;p.experimentalEnabled=true;p.outlineStyle=outlineNames.includes(old.body?.shape)?old.body.shape:'round';p.outlineAmount=80;p.alienStyle=/orbital|shrine|Shrine/.test(f||'')?'orbitalWaves':/tentacle|Tentacle|anemone/.test(f||'')?'coiledRibs':f?'eyePetals':'none';p.alienAmount=50;p.bodyDiameter=Math.max(25,Math.min(65,old.body?.width||56));p.bodyHeight=Math.max(8,Math.min(24,old.body?.height||14));p.stemHeight=Math.max(8,Math.min(34,old.handle?.height||21));p.handleStyle=classicHandles.includes(old.handle?.shape)?old.handle.shape:'straight';p.material=old.material||'pastelRainbow';p.rainbowPhase=old.rainbowPhase||0;p.paint={strokes:[]};delete p.design;}
 return p;
}
export function experimentalOutline(p,a){
 if(!p.experimentalEnabled||p.outlineStyle==='round')return 1;
 const angle=a-p.twist*.025;
 // Filter corners and avoid narrow waists; this affects radius, never body height.
 const smooth=(radius(p.outlineStyle,angle-.045)+2*radius(p.outlineStyle,angle)+radius(p.outlineStyle,angle+.045))/4;
 return 1+(Math.max(.38,Math.min(1.15,smooth))-1)*p.outlineAmount/100;
}
export function experimentalLift(p,a,t){
 if(!p.experimentalEnabled||p.alienStyle==='none'||t<=.5)return 0;
 const u=(t-.5)*2,envelope=Math.sin(Math.PI*u)**2,A=p.alienAmount/100*1.8,repeat=Math.max(3,Math.min(8,p.lobes||6)),phase=a*repeat+p.twist*u*.3;
 if(p.alienStyle==='orbitalWaves')return A*envelope*(.5+.5*Math.cos(u*Math.PI*6));
 if(p.alienStyle==='coiledRibs')return A*envelope*(.5+.5*Math.cos(phase+u*3));
 return A*envelope*(.5+.5*Math.cos(phase))*(.65+.35*Math.cos(u*Math.PI*4));
}
export function classicHandleRadius(style,t,r,a){
 const bump=(c,w)=>Math.exp(-(((t-c)/w)**2));let scale=1;
 if(style==='lighthouse')scale=.92-.3*t+.38*bump(.74,.09)+.52*bump(.9,.08);
 if(style==='strawberry')scale=.72+.65*bump(.65,.24)+.035*Math.cos(a*6)*Math.sin(Math.PI*t)**2;
 if(style==='castle')scale=.88+.15*Math.cos(a*4)**2+.35*bump(.85,.13);
 if(style==='crystal')scale=(.78+.45*Math.sin(Math.PI*t))*(.94+.06*Math.cos(a*6));
 if(style==='pawn')scale=.72+.28*bump(.12,.1)+.58*bump(.78,.17);
 return r*scale;
}
export function balanceExperimental(g,p){
 if(!p.experimentalEnabled)return g;
 const pos=g.attributes.position,core=p.stemDiameter*.75,weights=Array.from({length:pos.count},(_,i)=>Math.max(0,Math.min(1,(Math.hypot(pos.getX(i),pos.getZ(i))-core)/(p.bodyDiameter*.5-core))));
 for(let j=0;j<12;j++){const c=massProperties(g).centre;if(!Number.isFinite(c.x)||!Number.isFinite(c.z))break;for(let i=0;i<pos.count;i++){pos.setX(i,pos.getX(i)-c.x*1.5*weights[i]);pos.setZ(i,pos.getZ(i)-c.z*1.5*weights[i]);}}
 g.userData.balance=massProperties(g);g.computeVertexNormals();return g;
}
