import * as THREE from '../vendor/three.module.js';
import {mergeVertices} from '../vendor/BufferGeometryUtils.js';
export function editable(source){
 let g=source.clone();for(const name of Object.keys(g.attributes))if(name!=='position')g.deleteAttribute(name);
 const welded=mergeVertices(g,0.0001);g.dispose();g=welded;
 // Welding can collapse a tiny seam triangle onto an edge. Drop only zero-area
 // faces; retaining them invents non-manifold edges without retaining any surface.
 const p=g.attributes.position,indices=g.index.array,valid=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(let i=0;i<indices.length;i+=3){const x=indices[i],y=indices[i+1],z=indices[i+2];if(x===y||y===z||z===x)continue;a.fromBufferAttribute(p,x);b.fromBufferAttribute(p,y);c.fromBufferAttribute(p,z);if(b.sub(a).cross(c.sub(a)).lengthSq()<=1e-16)continue;valid.push(x,y,z);}
 if(valid.length!==indices.length){g.setIndex(valid);const compact=mergeVertices(g,0.0001);g.dispose();g=compact;}
 g.computeVertexNormals();return g;
}
export function topology(g){
 const p=g.attributes.position,idx=g.index?.array||Array.from({length:p.count},(_,i)=>i);
 const neighbors=Array.from({length:p.count},()=>new Set());const edges=new Map();
 for(let i=0;i<idx.length;i+=3)for(let j=0;j<3;j++){
  const a=idx[i+j],b=idx[i+(j+1)%3];neighbors[a].add(b);neighbors[b].add(a);
  const key=a<b?`${a},${b}`:`${b},${a}`;edges.set(key,(edges.get(key)||0)+1);
 }
 return {neighbors,edges};
}
export class Brush{
 constructor(g,cellSize=5){this.g=g;this.cellSize=cellSize;this.links=topology(g).neighbors;this.scratch=new Float32Array(g.attributes.position.array.length);this.rebuild();this.faces=g.index?.array||Uint32Array.from({length:g.attributes.position.count},(_,i)=>i);this.incident=Array.from({length:g.attributes.position.count},()=>[]);for(let f=0;f<this.faces.length/3;f++)for(let j=0;j<3;j++)this.incident[this.faces[f*3+j]].push(f);this.probe=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));}
 key(x,y,z){return `${Math.floor(x/this.cellSize)},${Math.floor(y/this.cellSize)},${Math.floor(z/this.cellSize)}`;}
 rebuild(){this.grid=new Map();this.keys=[];const p=this.g.attributes.position;for(let i=0;i<p.count;i++)this.indexVertex(i,p.getX(i),p.getY(i),p.getZ(i));}
 indexVertex(i,x,y,z){const k=this.key(x,y,z),previous=this.keys[i];if(previous===k)return;if(previous){const bucket=this.grid.get(previous);bucket.delete(i);if(!bucket.size)this.grid.delete(previous);}if(!this.grid.has(k))this.grid.set(k,new Set());this.grid.get(k).add(i);this.keys[i]=k;}
 apply(center,normal,radius,strength,mode,options={}){
  if(!(radius>0)||!Number.isFinite(strength))return 0;
  const p=this.g.attributes.position,n=this.g.attributes.normal;this.scratch.set(p.array);const old=this.scratch;
  const world=options.matrixWorld||new THREE.Matrix4();if(Math.abs(world.determinant())<1e-12)return 0;const inverse=world.clone().invert(),normalMatrix=new THREE.Matrix3().getNormalMatrix(world);
  const worldCenter=center.clone().applyMatrix4(world),worldNormal=normal.clone().applyMatrix3(normalMatrix).normalize();
  const planeCenter=options.planeCenter||worldCenter,planeNormal=options.planeNormal||worldNormal;
  const v=new THREE.Vector3(),neighbor=new THREE.Vector3(),avg=new THREE.Vector3(),surfaceNormal=new THREE.Vector3();
  // Walk the connected surface under the hit face. A nearby disconnected wing or
  // a back-facing underside must not move just because it is inside the sphere.
  let candidates;
  if(Number.isInteger(options.seedIndex)){
   candidates=[];const queue=[options.seedIndex],seen=new Set(queue);
   while(queue.length){const i=queue.pop();v.fromArray(old,i*3).applyMatrix4(world);if(v.distanceToSquared(worldCenter)>radius*radius)continue;
    candidates.push(i);for(const j of this.links[i])if(!seen.has(j)){seen.add(j);queue.push(j);}
   }
  }else{
   candidates=[];const localRadius=radius*Math.max(new THREE.Vector3().setFromMatrixColumn(inverse,0).length(),new THREE.Vector3().setFromMatrixColumn(inverse,1).length(),new THREE.Vector3().setFromMatrixColumn(inverse,2).length());
   const lo=center.clone().addScalar(-localRadius).divideScalar(this.cellSize).floor(),hi=center.clone().addScalar(localRadius).divideScalar(this.cellSize).floor();
   for(let x=lo.x;x<=hi.x;x++)for(let y=lo.y;y<=hi.y;y++)for(let z=lo.z;z<=hi.z;z++)for(const i of this.grid.get(`${x},${y},${z}`)||[])candidates.push(i);
  }
  let changed=0;const affected=[],modifiedFaces=new Set();let thickness=Infinity;
  if(mode==='push'||mode==='deflate'){this.probe.matrixWorld.copy(world);const ray=new THREE.Raycaster(worldCenter.clone().addScaledVector(worldNormal,-.000001),worldNormal.clone().negate(),.000001,radius*4);const back=ray.intersectObject(this.probe,false).find(h=>h.distance>.000002);if(back)thickness=back.distance;}

  for(const i of candidates){
   v.fromArray(old,i*3).applyMatrix4(world);const d=v.distanceTo(worldCenter);if(d>=radius)continue;
   surfaceNormal.fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();if(options.frontOnly&&surfaceNormal.dot(worldNormal)<=0.05)continue;
   const boost=Math.max(1,Math.min(2,Math.abs(strength)/.6)),before=v.clone(),w=(1-d/radius)**2,amount=Math.min(Math.abs(strength),radius*0.06*boost,thickness<=.001?0:thickness*.1);
   if(mode==='smooth'){
    avg.set(0,0,0);for(const j of this.links[i])avg.add(neighbor.fromArray(old,j*3).applyMatrix4(world));
    if(this.links[i].size)v.lerp(avg.divideScalar(this.links[i].size),Math.min(.6,amount*.45)*w);
   }else if(mode==='flatten')v.addScaledVector(planeNormal,-v.clone().sub(planeCenter).dot(planeNormal)*w*Math.min(.6,amount*.45));
   else if(mode==='inflate'||mode==='deflate')v.addScaledVector(surfaceNormal,amount*w*(mode==='deflate'?-1:1));
   else v.addScaledVector(surfaceNormal,amount*w*(mode==='push'||strength<0?-1:1));
   let edge=Infinity;for(const j of this.links[i])edge=Math.min(edge,before.distanceTo(neighbor.fromArray(old,j*3).applyMatrix4(world)));const displacement=v.clone().sub(before),limit=edge*.12*boost;if(displacement.length()>limit)v.copy(before).add(displacement.setLength(limit));
   if(v.distanceToSquared(before)<1e-16)continue;
   v.applyMatrix4(inverse);p.setXYZ(i,v.x,v.y,v.z);this.indexVertex(i,v.x,v.y,v.z);affected.push(i);for(const f of this.incident[i])modifiedFaces.add(f);changed++;
  }
  if(changed&&mode==='smooth'){const intermediate=p.array.slice();for(const i of affected){v.fromArray(intermediate,i*3).applyMatrix4(world);avg.set(0,0,0);for(const j of this.links[i])avg.add(neighbor.fromArray(intermediate,j*3).applyMatrix4(world));const d=new THREE.Vector3().fromArray(old,i*3).applyMatrix4(world).distanceTo(worldCenter),weight=(1-d/radius)**2;avg.divideScalar(this.links[i].size);v.addScaledVector(avg.sub(v),-Math.min(.6,Math.min(Math.abs(strength),radius*.06*Math.max(1,Math.min(2,Math.abs(strength)/.6)))*.47)*weight).applyMatrix4(inverse);p.setXYZ(i,v.x,v.y,v.z);}}
  // Back off the whole local step until no affected triangle flips or collapses.
  const cross=(array,f)=>{const a=new THREE.Vector3().fromArray(array,this.faces[f*3]*3),b=new THREE.Vector3().fromArray(array,this.faces[f*3+1]*3),c=new THREE.Vector3().fromArray(array,this.faces[f*3+2]*3);return b.sub(a).cross(c.sub(a));};
  const safe=()=>{for(const f of modifiedFaces){const before=cross(old,f),after=cross(p.array,f);if(before.lengthSq()>1e-16&&(after.lengthSq()<before.lengthSq()*.0625||before.dot(after)<before.lengthSq()*.2))return false;}return true;};
  if(changed){let attempts=0;while(!safe()&&attempts++<8)for(const i of affected)for(let j=0;j<3;j++)p.array[i*3+j]=(p.array[i*3+j]+old[i*3+j])*.5;if(!safe()){for(const i of affected)for(let j=0;j<3;j++)p.array[i*3+j]=old[i*3+j];changed=0;}for(const i of affected)this.indexVertex(i,p.getX(i),p.getY(i),p.getZ(i));}
  if(changed){p.needsUpdate=true;this.g.computeBoundingSphere();}return changed;
 }
 finish(){this.g.computeVertexNormals();this.g.computeBoundingSphere();}
}
export function inspect(g){
 const {edges,neighbors}=topology(g);let boundaries=0,nonManifold=0;for(const count of edges.values()){if(count===1)boundaries++;if(count>2)nonManifold++;}
 const visited=new Set();let components=0;for(let i=0;i<neighbors.length;i++){if(visited.has(i))continue;components++;const queue=[i];visited.add(i);while(queue.length){for(const j of neighbors[queue.pop()])if(!visited.has(j)){visited.add(j);queue.push(j);}}}
 g.computeBoundingBox();const d=g.boundingBox.getSize(new THREE.Vector3());
 return {triangles:(g.index?.count||g.attributes.position.count)/3,components,boundaryEdges:boundaries,nonManifoldEdges:nonManifold,dimensions:d.toArray()};
}
export function packObjects(objects){return {format:'3d-lab-v1',units:'mm',objects:objects.map(m=>({name:m.name,visible:m.visible,ignoredFloating:m.userData.ignoredFloating||[],positions:Array.from(m.geometry.attributes.position.array),indices:Array.from(m.geometry.index?.array||[]),position:m.position.toArray(),rotation:m.rotation.toArray().slice(0,3),scale:m.scale.toArray(),color:m.material.color.getHex()}))};}
export function unpackObjects(data){
 if(data?.format!=='3d-lab-v1'||!Array.isArray(data.objects)||data.objects.length>80)throw Error('This is not a 3D Lab project.');
 let total=0,totalTriangles=0;return data.objects.map(o=>{
  if(!Array.isArray(o.positions)||o.positions.length%9!==0&&o.positions.length%3!==0||!o.positions.length)throw Error('Invalid mesh.');
  total+=o.positions.length;if(total>1800000||o.positions.some(n=>!Number.isFinite(n)||Math.abs(n)>1e6))throw Error('This project exceeds workshop limits.');
  if(!Array.isArray(o.indices)||o.indices.length%3||o.indices.some(n=>!Number.isInteger(n)||n<0||n>=o.positions.length/3))throw Error('Invalid triangle indices.');
  totalTriangles+=(o.indices.length||o.positions.length/3)/3;if(totalTriangles>150000||!o.indices.length&&o.positions.length%9)throw Error('This project exceeds the triangle limit or has incomplete faces.');
  for(const k of ['position','rotation','scale'])if(!Array.isArray(o[k])||o[k].length!==3||o[k].some(n=>!Number.isFinite(n)||Math.abs(n)>1e4))throw Error('Invalid transform.');
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(o.positions,3));if(o.indices.length)g.setIndex(o.indices);g.computeVertexNormals();
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:Number.isInteger(o.color)?o.color:0x997deb,roughness:0.75}));m.userData.ignoredFloating=Array.isArray(o.ignoredFloating)?o.ignoredFloating.filter(n=>Number.isSafeInteger(n)&&n>=0).slice(0,150000):[];m.name=String(o.name||'Shape').slice(0,60);m.visible=o.visible!==false;m.position.fromArray(o.position);m.rotation.set(...o.rotation);m.scale.fromArray(o.scale);return m;
 });
}
