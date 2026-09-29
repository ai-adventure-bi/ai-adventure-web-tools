import {massProperties} from './mesh-metrics.js';
import {buildHybrid} from './hybrid.js';
import {buildSculpture} from './sculpture.js';

import * as THREE from '../vendor/three.module.js';

import {radius,handleRadius,TAU} from './design.js';



function relief(d,x,z,a,r){

 let v=0;const depth=d.surface.depth;

 switch(d.surface.texture){case 'seeds':v=Math.pow(Math.max(0,Math.cos(x*1.1)*Math.cos(z*1.4)),8);break;case 'spots':v=Math.pow(Math.max(0,Math.cos(x*.65)*Math.cos(z*.65)),4);break;case 'scales':v=.5+.5*Math.sin(r*2+a*8);break;case 'waves':v=.5+.5*Math.sin(x*.9+Math.sin(z*.35));break;case 'spiral':v=.5+.5*Math.sin(a*5+r*.6);break;}

 v*=depth*(d.surface.relief==='engrave'?-1:1);

 for(const at of d.attachments)for(let k=0;k<at.repeat;k++){

 const rot=(at.rotation/180*Math.PI)+k/at.repeat*TAU,ca=Math.cos(rot),sa=Math.sin(rot),px=at.position.x*d.body.width/2,pz=at.position.z*d.body.width/2;

 const dx=x-(px*Math.cos(k/at.repeat*TAU)-pz*Math.sin(k/at.repeat*TAU)),dz=z-(px*Math.sin(k/at.repeat*TAU)+pz*Math.cos(k/at.repeat*TAU)),u=(dx*ca+dz*sa)/at.scale,w=(-dx*sa+dz*ca)/at.scale;

 if(at.shape==='tentacle'){const ang=Math.atan2(w,u),rr=Math.hypot(u,w),target=.45+.18*Math.sin(ang*1.5);v+=1.8*Math.exp(-(((rr-target)/.15)**2))*Math.max(0,1-rr);}

 else{const t=Math.hypot(u,w)/radius(at.shape,Math.atan2(w,u));if(t<1)v+=2.2*Math.pow(Math.sin(Math.PI*.5*(1-t)),.8);}

 }

 return v;

}

export {massProperties} from './mesh-metrics.js';

export function buildV2(d){
 if(d.hybrid){const g=buildHybrid(d);g.userData.balance=massProperties(g);return g;}

 if(d.sculpture){const g=buildSculpture(d.sculpture);g.userData.balance=massProperties(g);return g;}

 const N=192,K=28,R=d.body.width/2,neck=d.handle.width/2,thick=Math.max(d.safety.minimumThickness,d.body.height*.32)+d.surface.depth,rim=[];

 for(let i=0;i<N;i++){const a=i/N*TAU;let r=R*(radius(d.body.shape,a-.024)+2*radius(d.body.shape,a-.012)+3*radius(d.body.shape,a)+2*radius(d.body.shape,a+.012)+radius(d.body.shape,a+.024))/9;const wave=Math.cos(a*d.edge.repetition);r+=d.edge.amount*(d.edge.style==='waves'?wave:d.edge.style==='scallops'?-.5-.5*wave:d.edge.style==='gear'?Math.pow(.5+.5*wave,3):0);rim.push(Math.max(neck+3,r));}

 // A conical underside grows no faster than the configured angle from vertical.

 const underside=(Math.max(...rim)*Math.max(1,d.body.stretch)-neck)/Math.tan(d.safety.maximumOverhang*Math.PI/180)+2;

 const top=underside+thick,positions=[],indices=[],weights=[];

 const vertex=(x,y,z,w=0)=>{positions.push(x,y,z);weights.push(w);return weights.length-1;};

 const rings=[];const ring=(fn)=>{const ids=[];for(let i=0;i<N;i++)ids.push(vertex(...fn(i/N*TAU,i)));rings.push(ids);};

 const point=vertex(0,-6,0);

 ring(a=>[Math.cos(a)*(d.tip.style==='blunt'?1.1:.55),-5.5,Math.sin(a)*(d.tip.style==='blunt'?1.1:.55),0]);

 ring(a=>[Math.cos(a)*neck,0,Math.sin(a)*neck,0]);

 const coords=(a,i,t)=>{const rad=neck+(rim[i]-neck)*t,ang=a+d.body.twist*t*.35;return [Math.cos(ang)*rad+d.body.asymmetry*R*t,Math.sin(ang)*rad*d.body.stretch];};

 for(let j=1;j<=K;j++){const t=j/K;ring((a,i)=>{const [x,z]=coords(a,i,t);return [x,underside*t,z,t];});}

 ring((a,i)=>{const [x,z]=coords(a,i,1);return [x,top-.7,z,1];});

 for(let j=K;j>=0;j--){const t=j/K,fade=Math.sin(Math.PI*t)**2;ring((a,i)=>{const [x,z]=coords(a,i,t*.985);return [x,top+relief(d,x,z,a,Math.hypot(x,z))*fade,z,t*.985];});}

 // Neck and handle remain on the spindle axis; silhouette body shifts below them.

 for(let j=1;j<=48;j++){const t=j/48,cap=t>.94?Math.sqrt(Math.max(.04,1-((t-.94)/.065)**2)):1;ring(a=>{const r=neck*handleRadius(d.handle.shape,t,a+d.handle.twist*t)*cap;return [Math.cos(a)*r,top+d.handle.height*t,Math.sin(a)*r,0];});}

 const end=vertex(0,top+d.handle.height+.4,0);

 for(let i=0;i<N;i++)indices.push(point,rings[0][i],rings[0][(i+1)%N]);

 for(let j=0;j<rings.length-1;j++)for(let i=0;i<N;i++){const a=rings[j][i],b=rings[j][(i+1)%N],c=rings[j+1][(i+1)%N],e=rings[j+1][i];indices.push(a,e,b,b,e,c);}

 for(let i=0;i<N;i++)indices.push(rings.at(-1)[i],end,rings.at(-1)[(i+1)%N]);

 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);

 const before=massProperties(g);let correction={x:0,z:0};

 if(d.safety.balanceCorrection){const p=g.attributes.position;for(let step=0;step<5;step++){const m=massProperties(g),dx=-m.centre.x*1.35,dz=-m.centre.z*1.35;correction.x+=dx;correction.z+=dz;for(let i=0;i<p.count;i++){p.setX(i,p.getX(i)+weights[i]*dx);p.setZ(i,p.getZ(i)+weights[i]*dz);}}}

 g.computeVertexNormals();g.computeBoundingBox();g.userData={balanceBefore:before.centre,balance:massProperties(g),correction,undersideHeight:underside,minimumBodyThickness:thick-d.surface.depth,designV2:true};return g;

}



export function meshAudit(g){const p=g.attributes.position,ix=g.index.array,edges=new Map();let degenerate=0;const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();for(let i=0;i<ix.length;i+=3){a.fromBufferAttribute(p,ix[i]);b.fromBufferAttribute(p,ix[i+1]);c.fromBufferAttribute(p,ix[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-14)degenerate++;for(let j=0;j<3;j++){const u=ix[i+j],v=ix[i+(j+1)%3],key=u<v?`${u},${v}`:`${v},${u}`;const e=edges.get(key)||[0,0];e[0]++;e[1]+=u<v?1:-1;edges.set(key,e);}}return {triangles:ix.length/3,degenerate,badEdges:[...edges.values()].filter(e=>e[0]!==2||e[1]!==0).length,...massProperties(g)};}
