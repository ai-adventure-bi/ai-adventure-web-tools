import * as THREE from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {TransformControls} from '../vendor/TransformControls.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {STLExporter} from '../vendor/STLExporter.js';
import {editable,Brush,inspect,packObjects,unpackObjects} from './mesh.js';
import {FloatingReview} from './floating.js';
import {OnObjectControls,clampToFloor} from './on-object.js';
import {SelectionCut} from './selection-cut.js';import {sceneConnectivity} from './contact.js';
export class Workshop{
 constructor(host,onChange=()=>{}){
  this.host=host;this.onChange=onChange;this.objects=[];this.past=[];this.future=[];this.mode='orbit';this.radius=6;this.strength=0.6;this.brushes=new WeakMap();this.arrangeMode='translate';this.workspace='arrange';this.lastBrush='pull';this.touches=new Map();this.revision=0;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xe6e9dc);this.camera=new THREE.PerspectiveCamera(40,1,0.1,2000);this.camera.position.set(130,100,150);
  this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:false});this.renderer.localClippingEnabled=true;this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));host.append(this.renderer.domElement);
  this.scene.add(new THREE.HemisphereLight(0xffffff,0x7d8772,2.8));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(80,150,100);this.scene.add(light);
  this.group=new THREE.Group();this.scene.add(this.group);const grid=new THREE.GridHelper(250,25,0xb2b9a8,0xcbd0c0);this.scene.add(grid);
  this.cursor=new THREE.Group();this.cursor.visible=false;this.scene.add(this.cursor);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.96,1,64),new THREE.MeshBasicMaterial({color:0x6543c3,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.9}));ring.renderOrder=20;this.cursor.add(ring);
  const dot=new THREE.Mesh(new THREE.CircleGeometry(.035,16),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,depthTest:false}));dot.renderOrder=21;this.cursor.add(dot);
  this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.target.set(0,25,0);this.orbit.addEventListener('change',()=>this.render());
  this.transform=new TransformControls(this.camera,this.renderer.domElement);this.scene.add(this.transform.getHelper());this.transform.setSize(1.15);
  this.arrangement=new OnObjectControls(this);this.floatingReview=new FloatingReview(this);this.selectionCut=new SelectionCut(this);
  this.transform.addEventListener('dragging-changed',e=>{this.orbit.enabled=!e.value&&this.mode==='orbit';});
  this.transform.addEventListener('mouseDown',()=>{this.checkpoint();this.arrangement.begin();});this.transform.addEventListener('objectChange',()=>{this.arrangement.apply();this.render();});this.transform.addEventListener('mouseUp',()=>this.changed());this.transform.addEventListener('change',()=>this.render());
  this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.lastStroke=0;
  const canvas=this.renderer.domElement;
  canvas.tabIndex=0;canvas.setAttribute('aria-label','3D model. Choose Look around to orbit, or a brush to sculpt.');
  canvas.addEventListener('pointerdown',e=>this.down(e),true);canvas.addEventListener('pointermove',e=>this.move(e),true);canvas.addEventListener('pointerup',e=>this.up(e),true);canvas.addEventListener('pointercancel',e=>this.cancelPointer(e),true);
  canvas.addEventListener('dblclick',e=>{if(this.mode!=='orbit'||this.selectionCut?.faces)return;const hit=this.hit(e);if(hit){e.preventDefault();e.stopImmediatePropagation();this.select(hit.object);this.arrangement.showMenu(e);}},true);
  canvas.addEventListener('lostpointercapture',e=>{this.arrangement?.endGesture(e,true);if(e.pointerId===this.strokePointer)this.endStroke();});
  canvas.addEventListener('pointerleave',()=>{if(!this.stroke){this.cursor.visible=false;this.render();}});
  canvas.addEventListener('wheel',e=>{if(this.mode==='orbit'||this.navHeld)return;e.preventDefault();e.stopImmediatePropagation();this.zoom(Math.exp(Math.sign(e.deltaY)*.12));},{capture:true,passive:false});
  window.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;if(e.code==='Space'){e.preventDefault();this.endStroke();this.navHeld=true;this.updateControls();}if(e.key==='Escape'){this.selectionCut?.clear();if(!this.arrangement?.endGesture(null,true))this.cancelStroke();}});
  window.addEventListener('keyup',e=>{if(e.code==='Space'){this.navHeld=false;this.updateControls();}});
  window.addEventListener('blur',()=>{this.arrangement?.endGesture(null,true);this.endStroke();this.touches.clear();this.touchNavigation=false;this.navHeld=false;this.updateControls();});
  new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);this.render();}).observe(host);
 }
 render(){this.arrangement?.sync();this.floatingReview?.sync();this.renderer.render(this.scene,this.camera);}
 serialize(){return {...packObjects(this.objects),selectedIndex:this.objects.indexOf(this.selected)};}
 remember(snapshot){this.past.push(snapshot);this.future=[];this.revision++;let size=0;for(let i=this.past.length-1;i>=0;i--){size+=this.past[i].objects.reduce((n,o)=>n+(o.positions.length+o.indices.length)*8,0);if(size>48*1024*1024){this.past.splice(0,i+1);break;}}if(this.past.length>20)this.past.shift();}
 checkpoint(){this.endStroke();this.remember(this.serialize());}
 undo(){if(this.selectionCut?.faces||this.selectionCut?.drag){this.selectionCut.clear();return;}if(this.arrangement?.endGesture(null,true))return;this.endStroke();if(!this.past.length)return;this.future.push(this.serialize());this.revision++;this.restore(this.past.pop());}
 redo(){if(this.selectionCut?.faces||this.selectionCut?.drag){this.selectionCut.clear();return;}if(this.arrangement?.endGesture(null,true))return;this.endStroke();if(!this.future.length)return;this.past.push(this.serialize());this.revision++;this.restore(this.future.pop());}
 clear(){this.selectionCut?.clear();this.arrangement?.endGesture(null,true);this.floatingReview?.reset();this.endStroke();this.transform.detach();if(this.cursor)this.cursor.visible=false;for(const m of this.objects){this.group.remove(m);m.geometry.dispose();m.material.dispose();}this.objects=[];this.selected=null;this.brushes=new WeakMap();}
 restore(data){const meshes=unpackObjects(data);this.clear();for(const m of meshes){this.objects.push(m);this.group.add(m);}this.select(this.objects[data.selectedIndex??0]);this.changed();}
 loadProject(data){const meshes=unpackObjects(data);this.checkpoint();this.clear();for(const m of meshes){this.objects.push(m);this.group.add(m);}this.select(this.objects[0]);this.fit();this.changed();}
 changed(){this.onChange(this);this.render();}
 select(m){if(m!==this.selected)this.selectionCut?.clear();if(this.arrangement?.menu)this.arrangement.menu.hidden=true;this.arrangement?.endGesture(null,true);this.endStroke();this.selected=m||null;this.updateControls();this.changed();}
 checkConnections(){return sceneConnectivity(this.objects);}
 reviewConnections(){const report=this.checkConnections();if(!report.connected)this.floatingReview?.forceScene(report);return report.connected;}
 totalTriangles(){return this.objects.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0);}
 add(kind,history=true){
  if(this.objects.length>=80||this.totalTriangles()>145000)throw Error('This workshop is full. Save before starting another project.');
  if(history)this.checkpoint();
  const geometry=kind==='box'?new THREE.BoxGeometry(20,20,20,8,8,8):kind==='cone'?new THREE.ConeGeometry(10,28,32,12):kind==='cylinder'?new THREE.CylinderGeometry(14,14,10,40,8):kind==='base'?new THREE.CylinderGeometry(35,35,5,48,2):new THREE.SphereGeometry(14,48,32);
  const mesh=new THREE.Mesh(editable(geometry),new THREE.MeshStandardMaterial({color:kind==='base'?0xb4d27b:0x987add,roughness:0.75}));geometry.dispose();mesh.position.set(0,kind==='base'?2.5:20,0);mesh.name=kind==='base'?'Printing base':`${kind[0].toUpperCase()+kind.slice(1)} ${this.objects.length+1}`;this.objects.push(mesh);this.group.add(mesh);this.select(mesh);return mesh;
 }
 duplicate(){if(!this.selected)throw Error('Select a shape first.');if(this.totalTriangles()*2>150000||this.objects.length>=80)throw Error('Duplicating this shape exceeds the workshop limit.');this.checkpoint();const m=this.selected.clone();m.geometry=m.geometry.clone();m.material=m.material.clone();m.position.x+=20;m.name+=' copy';this.objects.push(m);this.group.add(m);this.select(m);}
 remove(){if(!this.selected)throw Error('Select a shape first.');this.checkpoint();const m=this.selected;this.objects=this.objects.filter(o=>o!==m);this.group.remove(m);m.geometry.dispose();m.material.dispose();this.select(this.objects[0]);}
 updateControls(){this.orbit.enabled=this.mode==='orbit'||!!this.navHeld;this.transform.detach();if(this.arrangement)this.arrangement.attach();else if(this.selected&&this.mode==='orbit'&&this.arrangeMode){this.transform.setMode(this.arrangeMode);this.transform.attach(this.selected);}this.cursor.visible=false;this.renderer.domElement.style.cursor=this.mode==='orbit'||this.navHeld?'grab':'crosshair';this.render();}
 setMode(mode){this.selectionCut?.clear();this.arrangement?.endGesture(null,true);this.endStroke();this.touches.clear();this.touchNavigation=false;this.gesture=null;this.navHeld=false;this.mode=mode;if(mode!=='orbit'){this.lastBrush=mode;if(!this.selected)this.selected=this.objects.find(m=>m.visible!==false)||null;}this.updateControls();this.changed();}
 setWorkspace(panel){if(panel!==this.workspace)this.selectionCut?.clear();this.workspace=panel;this.setMode(panel==='sculpt'?(this.lastBrush||'pull'):'orbit');if(panel==='arrange'){this.arrangeMode=this.arrangeMode||'translate';this.updateControls();}this.changed();}
 setTransform(mode){this.setMode('orbit');if(this.workspace==='cut')this.selectionCut.kind='orbit';this.arrangeMode=mode;this.updateControls();this.changed();}
 hit(e){const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.camera.updateMatrixWorld(true);this.group.updateMatrixWorld(true);this.ray.setFromCamera(this.pointer,this.camera);return this.ray.intersectObjects(this.objects.filter(m=>m.visible!==false),false)[0];}
 down(e){
  if(this.mode==='orbit'&&this.lastTap&&performance.now()-this.lastTap.time<350&&Math.hypot(e.clientX-this.lastTap.x,e.clientY-this.lastTap.y)<20){const hit=this.hit(e);if(hit?.object===this.lastTap.object){e.preventDefault();e.stopImmediatePropagation();this.select(hit.object);this.arrangement?.showMenu(e);this.lastTap=null;this.menuPointer=e.pointerId;return;}}
  if(this.arrangement?.pointerDown(e))return;
  if(!this.transform.axis&&this.selectionCut?.down(e))return;
  if(this.mode==='orbit'||this.navHeld){if(e.button===0)this.startPoint={x:e.clientX,y:e.clientY};return;}
  e.preventDefault();e.stopImmediatePropagation();this.renderer.domElement.focus({preventScroll:true});
  if(e.pointerType==='touch'){this.touches.set(e.pointerId,[e.clientX,e.clientY]);this.renderer.domElement.setPointerCapture(e.pointerId);if(this.touches.size>1){this.endStroke();this.touchNavigation=true;this.gesture=this.touchGesture();return;}}
  if(e.button!==0||this.touchNavigation)return;const hit=this.hit(e);if(hit&&hit.object!==this.selected)this.select(hit.object);this.showCursor(hit);if(!hit)return;
  this.strokeBefore=this.serialize();this.strokeFuture=this.future;this.strokeRevision=this.revision;this.stroke=true;this.strokePointer=e.pointerId;this.strokeMesh=hit.object;this.strokeChanged=false;this.strokeMode=e.shiftKey?'smooth':this.mode;
  this.flattenCenter=hit.point.clone();this.flattenNormal=hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
  this.previousHit=null;this.renderer.domElement.setPointerCapture(e.pointerId);this.paint(hit,e);
 }
 move(e){
  if(this.selectionCut?.move(e))return;
  if(this.arrangement?.moveGesture(e))return;
  if(this.mode==='orbit'||this.navHeld)return;
  if(e.pointerType==='touch'&&this.touches.has(e.pointerId)){this.touches.set(e.pointerId,[e.clientX,e.clientY]);if(this.touchNavigation){e.preventDefault();e.stopImmediatePropagation();this.panTouch();return;}}
  if(this.stroke&&e.pointerId!==this.strokePointer)return;const now=performance.now();if(now-(this.stroke?this.lastStroke:(this.lastHover||0))<24)return;this.lastHover=now;
  const hit=this.hit(e);this.showCursor(hit);if(this.stroke){e.preventDefault();e.stopImmediatePropagation();if(hit)this.paint(hit,e);else this.previousHit=null;}else this.render();
 }
 up(e){
  if(this.menuPointer===e.pointerId&&this.menuPointer!==undefined){e.preventDefault();e.stopImmediatePropagation();this.menuPointer=null;return;}
  if(this.selectionCut?.up(e))return;
  if(this.arrangement?.endGesture(e))return;
  if(this.mode!=='orbit'&&!this.navHeld){e.stopImmediatePropagation();e.preventDefault();this.touches.delete(e.pointerId);if(e.pointerId===this.strokePointer)this.endStroke();if(!this.touches.size){this.touchNavigation=false;this.gesture=null;}if(e.pointerType==='touch')this.cursor.visible=false;this.render();return;}
  if(this.startPoint&&Math.hypot(e.clientX-this.startPoint.x,e.clientY-this.startPoint.y)<5&&!this.transform.axis){const hit=this.hit(e),previous=this.lastTap;this.select(hit?.object||null);if(hit&&previous?.object===hit.object&&performance.now()-previous.time<350&&Math.hypot(e.clientX-previous.x,e.clientY-previous.y)<20){this.arrangement?.showMenu(e);this.lastTap=null;}else this.lastTap=hit?{object:hit.object,time:performance.now(),x:e.clientX,y:e.clientY}:null;}this.startPoint=null;
 }
 cancelPointer(e){if(this.selectionCut?.drag){this.selectionCut.clear();return;}if(this.arrangement?.endGesture(e,true))return;this.touches.delete(e.pointerId);this.endStroke();if(!this.touches.size)this.touchNavigation=false;this.cursor.visible=false;this.render();}
 endStroke(){if(!this.stroke)return;this.stroke=false;this.strokePointer=null;this.brushes.get(this.strokeMesh)?.finish();this.strokeMesh?.geometry.computeBoundingBox();this.previousHit=null;this.strokeBefore=null;this.changed();}
 cancelStroke(){if(!this.stroke)return;const before=this.strokeBefore,future=this.strokeFuture,changed=this.strokeChanged,revision=this.strokeRevision;this.endStroke();if(changed){this.past.pop();this.future=future;this.revision=revision??this.revision;this.restore(before);}this.changed();}
 showCursor(hit){this.cursor.visible=!!hit;if(!hit)return;const normal=hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();this.cursor.position.copy(hit.point).addScaledVector(normal,.08);this.cursor.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);this.cursor.scale.setScalar(this.radius);}
 paint(hit,e={}){
  this.lastStroke=performance.now();const m=hit.object;if(m!==this.strokeMesh)return;let brush=this.brushes.get(m);if(!brush){brush=new Brush(m.geometry);this.brushes.set(m,brush);}
  const previous=this.previousHit,steps=previous?Math.min(8,Math.max(1,Math.ceil(previous.distanceTo(hit.point)/(this.radius*.25)))):1;
  const normal=hit.face.normal.clone(),mode=e.shiftKey?'smooth':this.strokeMode;
  for(let i=1;i<=steps;i++){
   const point=previous?previous.clone().lerp(hit.point,i/steps):hit.point.clone(),center=m.worldToLocal(point);
   const pressure=e.pointerType==='pen'?Math.max(.15,e.pressure||.5):1;
   const changed=brush.apply(center,normal,this.radius,this.strength*pressure,mode,{matrixWorld:m.matrixWorld,seedIndex:hit.face.a,frontOnly:true,planeCenter:this.flattenCenter,planeNormal:this.flattenNormal});
   if(changed&&!this.strokeChanged){this.remember(this.strokeBefore);this.strokeChanged=true;}
  }
  this.previousHit=hit.point.clone();m.geometry.computeVertexNormals();this.render();
 }
 zoom(factor){const offset=this.camera.position.clone().sub(this.orbit.target),distance=Math.min(900,Math.max(8,offset.length()*factor));this.camera.position.copy(this.orbit.target).add(offset.setLength(distance));this.orbit.update();this.render();}
 touchGesture(){const p=[...this.touches.values()];if(p.length<2)return null;return {x:(p[0][0]+p[1][0])/2,y:(p[0][1]+p[1][1])/2,d:Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1])};}
 panTouch(){const next=this.touchGesture(),old=this.gesture;if(next&&old){const units=2*this.camera.position.distanceTo(this.orbit.target)*Math.tan(this.camera.fov*Math.PI/360)/this.host.clientHeight;const shift=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0).multiplyScalar(-(next.x-old.x)*units).add(new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1).multiplyScalar((next.y-old.y)*units));this.camera.position.add(shift);this.orbit.target.add(shift);if(next.d>1&&old.d>1)this.zoom(old.d/next.d);else this.render();}this.gesture=next;}
 toggleVisibility(index){const m=this.objects[index];if(!m)return;this.checkpoint();m.visible=!m.visible;this.changed();}
 focusSelected(){if(!this.selected)return;const box=new THREE.Box3().setFromObject(this.selected),c=box.getCenter(new THREE.Vector3()),r=Math.max(25,box.getSize(new THREE.Vector3()).length()*1.8);const direction=this.camera.position.clone().sub(this.orbit.target).normalize();this.orbit.target.copy(c);this.camera.position.copy(c).add(direction.multiplyScalar(r));this.orbit.update();this.render();}
 fit(){const box=new THREE.Box3().setFromObject(this.group);if(box.isEmpty()){this.camera.position.set(130,100,150);this.orbit.target.set(0,25,0);}else{const c=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).length();this.orbit.target.copy(c);this.camera.position.copy(c).add(new THREE.Vector3(1,.7,1).normalize().multiplyScalar(Math.max(80,size*1.7)));}this.orbit.update();this.render();}
 view(name){const directions={front:[0,0,1],back:[0,0,-1],left:[-1,0,0],right:[1,0,0],top:[.001,1,0],under:[.001,-1,0]};const distance=this.camera.position.distanceTo(this.orbit.target);this.camera.position.copy(this.orbit.target).add(new THREE.Vector3(...directions[name]).multiplyScalar(distance));this.orbit.update();this.render();}
 async importGLB(url,current=()=>true){
  const response=await fetch(url);if(!response.ok)throw Error('Could not download the model. Check its status again.');const buffer=await response.arrayBuffer();
  // Standalone mesh only: never load external textures, buffers or third-party URIs.
  const view=new DataView(buffer);if(view.getUint32(0,true)!==0x46546c67)throw Error('Expected a GLB model.');
  const len=view.getUint32(12,true);const doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,len)));
  if(doc.images?.length||doc.buffers?.some(b=>b.uri))throw Error('Use an untextured, self-contained GLB model.');
  const gltf=await new GLTFLoader().parseAsync(buffer,'');const meshes=[];let triangles=0;gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;const geometry=editable(o.geometry);geometry.applyMatrix4(o.matrixWorld);meshes.push(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x987add,roughness:.75})));}});
  if(!meshes.length||triangles>150000||meshes.length>80)throw Error('This model exceeds the 150,000-triangle workshop limit.');
  if(!current()){for(const m of meshes){m.geometry.dispose();m.material.dispose();}return false;}
  this.checkpoint();this.clear();for(const m of meshes){this.group.add(m);this.objects.push(m);m.name=`Sculpture ${this.objects.length}`;}
  const box=new THREE.Box3().setFromObject(this.group),size=box.getSize(new THREE.Vector3()),scale=100/Math.max(size.x,size.y,size.z),center=box.getCenter(new THREE.Vector3());
  for(const m of meshes){m.geometry.translate(-center.x,-box.min.y,-center.z);m.geometry.scale(scale,scale,scale);m.geometry.computeVertexNormals();}this.select(meshes[0]);this.fit();this.changed();
 }
 stl(){if(!this.objects.length)throw Error('Add or open a sculpture first.');this.group.updateMatrixWorld(true);return new STLExporter().parse(this.group,{binary:true});}
 inspect(){if(!this.selected)throw Error('Select a shape first.');const g=this.selected.geometry.clone();g.applyMatrix4(this.selected.matrix);const result=inspect(g);g.dispose();return result;}
 apply(operations){if(!this.selected)throw Error('Select a shape first.');this.checkpoint();for(const op of operations){if(op.type==='scale_selected')this.selected.scale.multiplyScalar(op.factor);else for(let i=0;i<op.count;i++){const m=this.add(op.shape,false);m.position.set((i-(op.count-1)/2)*20,40,0);}}for(const mesh of this.objects)clampToFloor(mesh);this.changed();}
}
