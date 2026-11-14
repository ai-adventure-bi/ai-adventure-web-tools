import * as THREE from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {unpackObjects} from './mesh.js';

export function reviewSimplifiedModel(project){
 return new Promise((resolve,reject)=>{
  const dialog=document.createElement('dialog');dialog.className='importPreview';
  dialog.innerHTML='<h2>Check your simplified model</h2><p class="importCounts"></p><p>Some fine detail may have changed. Drag to turn the preview and scroll to zoom. Your current Workshop is kept until you choose Use this model.</p><div class="importPreviewCanvas"></div><div class="row"><button data-import-use class="primary">Use this model</button><button data-import-cancel>Cancel upload</button></div>';
  const info=project.importSummary;dialog.querySelector('.importCounts').textContent=info.originalTriangles.toLocaleString()+' → '+info.triangles.toLocaleString()+' triangles';document.body.append(dialog);
  let renderer,controls,resize;const meshes=[],scene=new THREE.Scene();let finished=false;
  const finish=(accepted,error)=>{if(finished)return;finished=true;if(resize)window.removeEventListener('resize',resize);controls?.dispose();for(const m of meshes){m.geometry.dispose();m.material.dispose();}renderer?.dispose();dialog.remove();if(error)reject(error);else resolve(accepted);};
  try{
   meshes.push(...unpackObjects(project));for(const m of meshes){m.visible=true;scene.add(m);}scene.background=new THREE.Color(0xe7eadf);scene.add(new THREE.HemisphereLight(0xffffff,0x756b8e,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(100,180,100);scene.add(light);
   const host=dialog.querySelector('.importPreviewCanvas'),camera=new THREE.PerspectiveCamera(40,1,.01,100000);renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));host.append(renderer.domElement);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;
   const box=new THREE.Box3();for(const m of meshes)box.expandByObject(m);const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).length();camera.position.copy(center).add(new THREE.Vector3(1,.6,1).normalize().multiplyScalar(Math.max(size*1.7,1)));camera.far=Math.max(size*100,1000);controls.target.copy(center);camera.updateProjectionMatrix();controls.update();
   const render=()=>renderer.render(scene,camera);resize=()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();render();};controls.addEventListener('change',render);window.addEventListener('resize',resize);
   dialog.querySelector('[data-import-use]').onclick=()=>finish(true);dialog.querySelector('[data-import-cancel]').onclick=()=>finish(false);dialog.oncancel=e=>{e.preventDefault();finish(false);};dialog.showModal();resize();
  }catch(error){finish(false,error);}
 });
}
