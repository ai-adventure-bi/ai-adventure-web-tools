import {MeshoptSimplifier} from '../vendor/meshopt_simplifier.module.js';
import * as THREE from '../vendor/three.module.js';
import {STLLoader} from '../vendor/STLLoader.js';
import {OBJLoader} from '../vendor/OBJLoader.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {editable,packObjects,unpackObjects} from './mesh.js';

// Imported models stay on this device. Textures/materials are discarded so the
// result is editable sculpture geometry, without external network requests.
export async function importModelFile(file,{onProgress=()=>{}}={}){
 onProgress("Reading your model…");
 if(file.size>50*1024*1024)throw Error('Choose a model smaller than 50 MB.');
 const ext=file.name.split('.').pop().toLowerCase();
 let root,originalProject;
 if(ext==='json'){originalProject=JSON.parse(await file.text());const meshes=unpackObjects(originalProject,{maxTriangles:1000000,maxPositionValues:9000000});if(!meshes.length)throw Error('This project has no objects.');const count=meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0);if(count<=150000){for(const m of meshes){m.geometry.dispose();m.material.dispose();}delete originalProject.importSummary;return originalProject;}root=new THREE.Group();for(const mesh of meshes)root.add(mesh);}
 if(ext==='stl'){
  const buffer=await file.arrayBuffer();let count=0;if(buffer.byteLength>=84){const view=new DataView(buffer),n=view.getUint32(80,true);if(84+50*n===buffer.byteLength)count=n;}
  if(!count)count=(new TextDecoder().decode(buffer).match(/facet\s+normal/gi)||[]).length;
  if(count>1000000)throw Error('This model is above the 1,000,000-triangle import limit. Simplify it in another program first.');
  root=new THREE.Mesh(new STLLoader().parse(buffer));
 }else if(ext==='obj'){
  const text=await file.text();let count=0;for(const line of text.split(/\r?\n/))if(/^\s*f\s/.test(line)){count+=Math.max(0,line.trim().split(/\s+/).length-3);if(count>150000)throw Error('This model exceeds the 150,000-triangle limit.');}
  root=new OBJLoader().parse(text);
 }else if(ext==='glb'){
  const buffer=await file.arrayBuffer();if(buffer.byteLength<20)throw Error('This is not a valid GLB model.');const view=new DataView(buffer);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength||view.getUint32(16,true)!==0x4e4f534a)throw Error('This is not a valid GLB model.');
  const length=view.getUint32(12,true);if(20+length>buffer.byteLength)throw Error('This GLB is incomplete.');
  const doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)));
  if(doc.buffers?.some(b=>b.uri)||doc.extensionsRequired?.length)throw Error('Use a self-contained GLB without compressed geometry or required extensions. Export as STL or OBJ if needed.');
  delete doc.images;delete doc.textures;delete doc.materials;delete doc.animations;
  for(const mesh of doc.meshes||[])for(const primitive of mesh.primitives||[])delete primitive.material;
  const json=new TextEncoder().encode(JSON.stringify(doc)),padded=(json.length+3)&~3,tail=new Uint8Array(buffer,20+length),clean=new ArrayBuffer(20+padded+tail.length),out=new DataView(clean);
  out.setUint32(0,0x46546c67,true);out.setUint32(4,2,true);out.setUint32(8,clean.byteLength,true);out.setUint32(12,padded,true);out.setUint32(16,0x4e4f534a,true);new Uint8Array(clean,20,padded).fill(32);new Uint8Array(clean,20,json.length).set(json);new Uint8Array(clean,20+padded).set(tail);
  const manager=new THREE.LoadingManager();manager.setURLModifier(()=>{throw Error('External model resources are not supported.');});root=(await new GLTFLoader(manager).parseAsync(clean,'')).scene;
 }else if(ext!=='json')throw Error('Choose an STL, OBJ, GLB or 3D Lab JSON project.');
 const meshes=[];let triangles=0;try{
  root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh)return;if(o.isSkinnedMesh)throw Error('Export a static mesh before uploading this model.');const p=o.geometry.attributes.position;if(!p)return;triangles+=(o.geometry.index?.count||p.count)/3;if(triangles>1000000||meshes.length>=80)throw Error('Use up to 80 objects and 1,000,000 triangles for import.');const geometry=editable(o.geometry);geometry.applyMatrix4(o.matrixWorld);const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x987add,roughness:.75}));m.visible=o.visible;m.name=o.name||file.name.replace(/\.[^.]+$/,'');meshes.push(m);});
  if(!meshes.length)throw Error('No triangle meshes were found in this file.');
  const originalTriangles=triangles;
  if(triangles>150000){
   onProgress('Simplifying '+triangles.toLocaleString()+' triangles…');await MeshoptSimplifier.ready;
   for(let i=0;i<meshes.length;i++){const m=meshes[i],g=m.geometry,indices=g.index.array,count=indices.length/3,target=Math.max(1,Math.floor(140000*count/triangles));if(count<=target)continue;
    let result;for(const error of [.005,.01,.03,.05]){result=MeshoptSimplifier.simplify(indices,g.attributes.position.array,3,target*3,error);if(result[0].length<=target*3)break;}
    if(!result[0].length)throw Error('This model could not be simplified without losing an object.');
    g.setIndex(new THREE.BufferAttribute(result[0],1));const compact=editable(g);g.dispose();m.geometry=compact;onProgress('Simplifying object '+(i+1)+' of '+meshes.length+'…');
   }
   const reduced=meshes.reduce((n,m)=>n+m.geometry.index.count/3,0);if(reduced>150000)throw Error('This model could not be reduced enough while preserving its structure. Simplify it in another program first.');
  }

  // STL uses print millimetres. Other mesh formats are fitted to 100 mm because
  // OBJ units vary and GLB assets commonly arrive in metres.
  const box=new THREE.Box3();for(const m of meshes)box.expandByObject(m);const size=box.getSize(new THREE.Vector3()),extent=Math.max(size.x,size.y,size.z),center=box.getCenter(new THREE.Vector3());if(!Number.isFinite(extent)||extent<=0)throw Error('The model has invalid or empty geometry.');const scale=ext==='stl'||ext==='json'?1:100/extent;
  for(const m of meshes){if(ext==='json')continue;m.geometry.translate(-center.x,-box.min.y,-center.z);m.geometry.scale(scale,scale,scale);}
  const project=packObjects(meshes),checked=unpackObjects(project);for(const m of checked){m.geometry.dispose();m.material.dispose();}if(originalProject?.metadata)project.metadata=originalProject.metadata;if(originalTriangles>150000)project.importSummary={originalTriangles,triangles:meshes.reduce((n,m)=>n+m.geometry.index.count/3,0)};onProgress('Preparing preview…');return project;
 }finally{for(const m of meshes){m.geometry.dispose();m.material.dispose();}root.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});}
}

export function importModelForEditor(file,{onProgress=()=>{},signal}={}){
 if(typeof Worker==='undefined')return importModelFile(file,{onProgress});
 return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./model-import-worker.js',import.meta.url),{type:'module'});const cleanup=()=>{worker.terminate();signal?.removeEventListener('abort',abort);};const abort=()=>{cleanup();reject(Error('Model import cancelled. Your current model is unchanged.'));};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)return abort();worker.onmessage=({data})=>{if(data.progress){onProgress(data.progress);return;}cleanup();if(data.error)reject(Error(data.error));else resolve(data.project);};worker.onerror=()=>{cleanup();reject(Error('The model could not be processed on this device. Try a smaller file.'));};worker.postMessage(file);});
}
