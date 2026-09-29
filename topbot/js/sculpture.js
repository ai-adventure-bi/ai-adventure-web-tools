import * as THREE from '../vendor/three.module.js';

export const sculptures={
 chalice:{name:'Witch’s chalice',description:'An open goblet with curling loop handles and a tiny spinning foot.'},
 alienPod:{name:'Alien seed pod',description:'A hollow egg with huge windows, a living core and a crown of feelers.'},
 orbital:{name:'Orbital relic',description:'Intersecting space rings suspended around a central pearl.'},
 anemone:{name:'Deep-sea creature',description:'Thick tentacles rise and curl around an open mouth.'},
 lantern:{name:'Twisted lantern',description:'An airy cage of spiralling ribs around a floating-looking heart.'},
 crown:{name:'Antler crown',description:'A hollow crown with tall branching horns and an exposed stem.'},
 hourglass:{name:'Impossible hourglass',description:'Two open trumpet shells meet at a narrow waist.'},
 shrine:{name:'Alien shrine',description:'A stepped flying-saucer altar carried on sweeping arches.'}
};
export const defaultSculpture=()=>({family:'chalice',height:48,width:52,arms:4,twist:0.65,flare:0.65,wall:3.2});
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// Solid modelling primitives. Each one has an explicit bounding box so field
// sampling visits only the grid cells near it, including Boolean cavities.
function sceneFor(s){
 const parts=[],R=s.width/2,H=s.height/48,W=s.wall,N=s.arms,T=s.twist,F=s.flare;
 const ell=(x,y,z,rx,ry,rz)=>Math.min(rx,ry,rz)*(Math.hypot(x/rx,y/ry,z/rz)-1);
 const shape=(bounds,fn)=>parts.push({bounds,fn});
 const ball=(x,y,z,rx,ry=rx,rz=rx)=>shape([x-rx-1,x+rx+1,y-ry-1,y+ry+1,z-rz-1,z+rz+1],(a,b,c)=>ell(a-x,b-y,c-z,rx,ry,rz));
 function segment(a,b,ra,rb=ra){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],ll=dx*dx+dy*dy+dz*dz,r=Math.max(ra,rb)+1;shape([Math.min(a[0],b[0])-r,Math.max(a[0],b[0])+r,Math.min(a[1],b[1])-r,Math.max(a[1],b[1])+r,Math.min(a[2],b[2])-r,Math.max(a[2],b[2])+r],(x,y,z)=>{const t=clamp(((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/ll,0,1);return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy,z-a[2]-t*dz)-(ra+(rb-ra)*t);});}
 function path(fn,r=2.1,end=r,steps=24){let a=fn(0);for(let i=1;i<=steps;i++){const t=i/steps,b=fn(t);segment(a,b,r+(end-r)*(i-1)/steps,r+(end-r)*t);a=b;}}
 const ring=(radius,y,tube,tilt=0,angle=0)=>path(t=>{const a=t*TAU,x=Math.cos(a)*radius,z=Math.sin(a)*radius,yy=z*Math.sin(tilt);return [x*Math.cos(angle)-z*Math.cos(tilt)*Math.sin(angle),y+yy,x*Math.sin(angle)+z*Math.cos(tilt)*Math.cos(angle)];},tube,tube,60);
 function cup(y,rx,ry,top,scallop=0){const floor=3.5;shape([-rx*1.08-1,rx*1.08+1,y-ry-1,top+scallop+1,-rx*1.08-1,rx*1.08+1],(x,yy,z)=>{const a=Math.atan2(z,x),rip=scallop*Math.cos(a*N+T*yy*.04),r=1+.07*F*Math.cos(a*N+T*yy*.07);const outer=Math.max(ell(x/r,yy-y,z/r,rx,ry,rx),yy-top-rip),inside=ell(x/r,yy-y-floor,z/r,rx-W,ry-floor,rx-W);return Math.max(outer,-inside);});}
 // All sculptures retain a connected, rounded contact point and a strong foot.
 segment([0,-5,0],[0,5*H,0],.85,3.7);
 const radial=(a,r,y)=>[Math.cos(a)*r,y,Math.sin(a)*r];
 if(s.family==='chalice'){
  cup(29*H,R*.73,18*H,38*H,1.4*F);segment([0,3*H,0],[0,14*H,0],3.5,4.5);ring(6,7*H,1.7);
  for(let j=0;j<N;j++){const a=j/N*TAU;path(t=>{const r=R*(.56+.49*Math.sin(Math.PI*t)),ang=a+T*.45*Math.sin(TAU*t);return radial(ang,r,(22+16*t+5*Math.sin(TAU*t))*H);},W*.6,W*.58,28);}
 }
 if(s.family==='alienPod'){
  const y=25*H,rx=R*.77,ry=21*H;shape([-rx-1,rx+1,y-ry-1,y+ry+1,-rx-1,rx+1],(x,yy,z)=>{let shell=Math.max(ell(x,yy-y,z,rx,ry,rx),-ell(x,yy-y,z,rx-W,ry-W,rx-W));for(let j=0;j<N;j++){const a=j/N*TAU,u=x*Math.cos(a)+z*Math.sin(a),v=-x*Math.sin(a)+z*Math.cos(a);const cut=ell(u-rx*.78,yy-y,v,rx*.7,ry*.47,rx*.29);shell=Math.max(shell,-cut);}return shell;});
  segment([0,3*H,0],[0,46*H,0],3.6,2.3);ball(0,25*H,0,7,10*H,7);
  for(let j=0;j<N;j++){const a=j/N*TAU;path(t=>radial(a+T*t,R*(.22+.45*t),(41+8*t-4*t*t)*H),2.2,1.5,20);}
 }
 if(s.family==='orbital'){
  segment([0,3*H,0],[0,41*H,0],3.3,2.7);ball(0,25*H,0,8,8,8);
  ring(R*.84,25*H,W*.65,.7+F*.4,0);ring(R*.84,25*H,W*.65,-.7-F*.4,0);
  ring(R*.53,25*H,W*.55,Math.PI/2,Math.PI/2);
  for(let j=0;j<N*2;j++){const a=j/N*TAU+(j>=N?Math.PI:0),tilt=.7+F*.4;for(const sign of [-1,1]){const target=[R*.84*Math.cos(a),25*H+R*.84*Math.sin(a)*Math.sin(tilt)*sign,R*.84*Math.sin(a)*Math.cos(tilt)];segment([0,25*H,0],target,2.2);ball(...target,3.1);}}
 }
 if(s.family==='anemone'){
  cup(16*H,R*.48,10*H,20*H,.5);segment([0,3*H,0],[0,9*H,0],3.6,5);
  for(let j=0;j<N;j++){const a=j/N*TAU;path(t=>{const r=R*(.35+.54*Math.sin(t*Math.PI*.78)),ang=a+T*1.2*t;return radial(ang,r,(14+25*t+8*Math.sin(Math.PI*t))*H);},W*.93,1.7,36);
   for(let k=0;k<3;k++){const t=.35+k*.17,r=R*(.35+.54*Math.sin(t*Math.PI*.78));ball(...radial(a+T*1.2*t,r-1.4,(14+25*t+8*Math.sin(Math.PI*t))*H),2.1);}}
 }
 if(s.family==='lantern'){
  ring(R*.48,11*H,W*.6);ring(R*.48,43*H,W*.6);segment([0,3*H,0],[0,46*H,0],3.3,2.3);ball(0,26*H,0,7,11*H,7);
  for(let j=0;j<N;j++){const a=j/N*TAU;path(t=>radial(a+T*2.4*t,R*(.48+.38*Math.sin(Math.PI*t)),(11+32*t)*H),W*.6,W*.6,34);segment([0,11*H,0],radial(a,R*.48,11*H),2.4);segment([0,43*H,0],radial(a+T*2.4,R*.48,43*H),2.4);}
 }
 if(s.family==='crown'){
  cup(21*H,R*.65,13*H,27*H,3*F);segment([0,3*H,0],[0,11*H,0],3.6,5);
  for(let j=0;j<N;j++){const a=j/N*TAU;path(t=>radial(a+T*.55*t,R*(.56+.3*t-.08*Math.sin(TAU*t)),(23+22*t)*H),W*.85,1.5,28);const stem=radial(a+T*.25,R*.66,33*H);path(t=>[stem[0]+Math.cos(a+.65)*R*.26*t,stem[1]+10*H*t,stem[2]+Math.sin(a+.65)*R*.26*t],2.2,1.4,16);}
 }
 if(s.family==='hourglass'){
  const low=14*H,waist=27*H,upper=43*H;shape([-R-1,R+1,low-1,upper+1,-R-1,R+1],(x,y,z)=>{const t=(y-waist)/(16*H),r=5+R*.62*t*t,ang=Math.atan2(z,x),rr=Math.hypot(x,z)/(1+.1*F*Math.cos(N*ang+T*y*.12));return Math.max(Math.abs(rr-r)-W*.5,low-y,y-upper);});
  segment([0,3*H,0],[0,29*H,0],3.3,3.4);ring(R*.6+5,43*H,W*.65);for(let j=0;j<N;j++)segment([0,14*H,0],radial(j/N*TAU,5+R*.62*(13/16)**2,14*H),W*.6);
 }
 if(s.family==='shrine'){
  segment([0,3*H,0],[0,44*H,0],3.5,2.5);ball(0,41*H,0,5,7*H,5);ring(R*.82,27*H,W*.65);ring(R*.58,35*H,W*.65);
  for(let j=0;j<N;j++){const a=j/N*TAU;path(t=>radial(a+T*.65*t,R*.83*Math.sin(Math.PI*t),(7+29*t)*H),W*.75,W*.6,34);path(t=>radial(a+T*.65,R*.58*t,(35+3*(1-t))*H),2.4,2.2,16);}
 }
 // Wide, tilted orbital rings must never touch the table before the point.
 if(s.family==='orbital'){const lift=Math.max(0,5-(25*H-R*.84*Math.sin(.7+F*.4)-W*.65));if(lift){for(const part of parts.slice(1)){const fn=part.fn;part.fn=(x,y,z)=>fn(x,y-lift,z);part.bounds[2]+=lift;part.bounds[3]+=lift;}segment([0,3*H,0],[0,5*H+lift,0],3.5);}}
 return parts;
}

// Marching tetrahedra shares edge vertices globally. Unlike merging intersecting
// meshes, sampling their union produces one surface with real tunnels/cavities.
export function buildSculpture(s){
 return meshSolid(sceneFor(s),s);
}
export function meshSolid(parts,s={},step=.65){
 const pad=2.8;
 const bounds=[Infinity,-Infinity,Infinity,-Infinity,Infinity,-Infinity];for(const p of parts)for(let a=0;a<3;a++){bounds[2*a]=Math.min(bounds[2*a],p.bounds[2*a]-pad);bounds[2*a+1]=Math.max(bounds[2*a+1],p.bounds[2*a+1]+pad);}
 const nx=Math.ceil((bounds[1]-bounds[0])/step)+1,ny=Math.ceil((bounds[3]-bounds[2])/step)+1,nz=Math.ceil((bounds[5]-bounds[4])/step)+1,plane=nx*ny,total=plane*nz;
 const values=new Float32Array(total);values.fill(1000);
 for(const p of parts){const b=p.bounds,lo=[0,1,2].map(a=>Math.max(0,Math.floor((b[a*2]-bounds[a*2])/step))),hi=[0,1,2].map(a=>Math.min([nx,ny,nz][a]-1,Math.ceil((b[a*2+1]-bounds[a*2])/step)));
  for(let k=lo[2];k<=hi[2];k++)for(let j=lo[1];j<=hi[1];j++)for(let i=lo[0];i<=hi[0];i++){const idx=i+nx*j+plane*k,v=p.fn(bounds[0]+i*step,bounds[2]+j*step,bounds[4]+k*step);if(v<values[idx])values[idx]=Math.abs(v)<1e-7?1e-7:v;}}
 // Move values infinitesimally away from the iso-level to avoid float32
 // collapse where the surface passes precisely through a lattice vertex.
 for(let i=0;i<total;i++)if(Math.abs(values[i])<.005)values[i]=values[i]<0?-.005:.005;
 const position=[],indices=[],cache=new Map(),tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],offset=[0,1,1+nx,nx,plane,plane+1,plane+1+nx,plane+nx];
 const coord=id=>{const z=Math.floor(id/plane),y=Math.floor((id-z*plane)/nx),x=id-z*plane-y*nx;return [bounds[0]+x*step,bounds[2]+y*step,bounds[4]+z*step];};
 function edge(a,b){const key=Math.min(a,b)*total+Math.max(a,b);if(cache.has(key))return cache.get(key);const pa=coord(a),pb=coord(b),t=values[a]/(values[a]-values[b]),id=position.length/3;position.push(pa[0]+t*(pb[0]-pa[0]),pa[1]+t*(pb[1]-pa[1]),pa[2]+t*(pb[2]-pa[2]));cache.set(key,id);return id;}
 function face(a,b,c,inside,outside){const ia=a*3,ib=b*3,ic=c*3,ux=position[ib]-position[ia],uy=position[ib+1]-position[ia+1],uz=position[ib+2]-position[ia+2],vx=position[ic]-position[ia],vy=position[ic+1]-position[ia+1],vz=position[ic+2]-position[ia+2],p=coord(inside),q=coord(outside);const dot=(uy*vz-uz*vy)*(q[0]-p[0])+(uz*vx-ux*vz)*(q[1]-p[1])+(ux*vy-uy*vx)*(q[2]-p[2]);if(dot<0)indices.push(a,c,b);else indices.push(a,b,c);}
 for(let k=0;k<nz-1;k++)for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const base=i+j*nx+k*plane,ids=offset.map(v=>base+v),bits=ids.map(v=>values[v]<0);if(bits.every(Boolean)||bits.every(v=>!v))continue;for(const t of tetra){const ins=t.filter(v=>bits[v]).map(v=>ids[v]),outs=t.filter(v=>!bits[v]).map(v=>ids[v]);if(!ins.length||!outs.length)continue;if(ins.length===1){const a=ins[0];face(edge(a,outs[0]),edge(a,outs[1]),edge(a,outs[2]),a,outs[0]);}else if(ins.length===3){const a=outs[0];face(edge(a,ins[0]),edge(a,ins[1]),edge(a,ins[2]),ins[0],a);}else{const a=edge(ins[0],outs[0]),b=edge(ins[0],outs[1]),c=edge(ins[1],outs[0]),d=edge(ins[1],outs[1]);face(a,b,c,ins[0],outs[0]);face(b,d,c,ins[0],outs[0]);}}}
 const clean=cleanSurface(position,indices);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(clean.position,3));g.setIndex(clean.indices);g.computeVertexNormals();g.computeBoundingBox();g.userData={designV2:true,sculptural:true,family:s.family,nominalWall:s.wall,gridStep:step,removedMicroSurfaces:clean.removed};return g;
}

function cleanSurface(position,indices){
 const n=position.length/3,parent=Int32Array.from({length:n},(_,i)=>i),find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
 for(let i=0;i<indices.length;i+=3){parent[find(indices[i+1])]=find(indices[i]);parent[find(indices[i+2])]=find(indices[i]);}
 const groups=new Map();for(let i=0;i<n;i++){const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(i);}
 const sorted=[...groups.values()].sort((a,b)=>b.length-a.length),keep=new Set(sorted[0]);
 // Sampling near intersecting tubes can enclose sub-voxel air bubbles. Fill
 // those tiny pockets; never silently discard a meaningful detached feature.
 for(const group of sorted.slice(1)){const root=find(group[0]);let volume=0;for(let i=0;i<indices.length;i+=3)if(find(indices[i])===root){const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;volume+=(position[a]*(position[b+1]*position[c+2]-position[b+2]*position[c+1])+position[a+1]*(position[b+2]*position[c]-position[b]*position[c+2])+position[a+2]*(position[b]*position[c+1]-position[b+1]*position[c]))/6;}if(Math.abs(volume)>1.5)throw Error('This sculpture has a detached part. Try fewer arms or a thicker wall.');}
 const remap=new Int32Array(n).fill(-1),pos=[],ix=[];for(const i of keep){remap[i]=pos.length/3;pos.push(position[i*3],position[i*3+1],position[i*3+2]);}for(let i=0;i<indices.length;i+=3)if(remap[indices[i]]>=0)ix.push(remap[indices[i]],remap[indices[i+1]],remap[indices[i+2]]);
 // A light volume-preserving Taubin pass reduces stair-stepping around cut
 // openings without sealing holes or changing the surface connectivity.
 const neighbours=Array.from({length:pos.length/3},()=>new Set());for(let i=0;i<ix.length;i+=3){const [a,b,c]=ix.slice(i,i+3);neighbours[a].add(b).add(c);neighbours[b].add(a).add(c);neighbours[c].add(a).add(b);}
 for(const factor of [.35,-.36,.35,-.36]){const out=pos.slice();for(let i=0;i<neighbours.length;i++){const ns=neighbours[i];for(let a=0;a<3;a++){let mean=0;for(const j of ns)mean+=pos[j*3+a];out[i*3+a]+=factor*(mean/ns.size-pos[i*3+a]);}}for(let i=0;i<pos.length;i++)pos[i]=out[i];}
 return {position:pos,indices:ix,removed:sorted.length-1};
}
