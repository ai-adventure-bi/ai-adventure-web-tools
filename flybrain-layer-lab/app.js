import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const $=id=>document.getElementById(id), N=15;
const colours=['#76e9d2','#e9b86d','#9d9cf9','#62bbff','#f18bac','#9fe390','#e98b5e','#c6c56d','#67d5eb','#d59cef','#e3d2a7','#a4c9f2'];
const rgb=colours.map(c=>new THREE.Color(c));
let manifest,layers=[],order=[],labels=[],selected=0,mode='slab',overlay=false,checked=false,reference=false,dragged=null;
let scene,camera,renderer,controls,groups=[],gap=13,webgl=true;
let sliceDrag=null;
const feedback=(text,kind='')=>{$('feedback').textContent=text;$('feedback').className=kind;};
const randomOrder=()=>{let a=Array.from({length:N},(_,i)=>i);for(let i=N-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
async function fetchOK(url){const r=await fetch(url);if(!r.ok)throw Error(`Could not load ${url} (${r.status})`);return r;}
function readLayer(buffer){let sizes=new Uint32Array(buffer,0,5),off=20,out={};['segments','surface','contour','lower','upper'].forEach((k,i)=>{out[k]=new Float32Array(buffer,off,sizes[i]);off+=sizes[i]*4;});return out;}
function geometry(positions,col){let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));if(col)g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeBoundingSphere();return g;}
function setup3D(){
  const el=$('viewport');scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,1,6000);
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(e){webgl=false;$('loading').textContent='3D needs WebGL. You can still inspect and reorder every slice below.';return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));el.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Rotatable brain stack');renderer.domElement.setAttribute('role','img');
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=220;controls.maxDistance=2300;controls.target.set(0,0,0);resetView();
  layers.forEach((L,i)=>{
    const group=new THREE.Group(),s=L.segments,p=new Float32Array(s.length/7*6),c=new Float32Array(p.length);
    for(let j=0,k=0;j<s.length;j+=7,k+=6){p.set(s.subarray(j,j+6),k);const col=rgb[s[j+6]%rgb.length];c.set([col.r,col.g,col.b,col.r,col.g,col.b],k);}
    const lines=new THREE.LineSegments(geometry(p,c),new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.8}));
    const shell=new THREE.Mesh(geometry(L.surface),new THREE.MeshBasicMaterial({color:0x7cbdc7,transparent:true,opacity:.05,side:THREE.DoubleSide,depthWrite:false}));
    const boundaries=new Float32Array(L.lower.length+L.upper.length);boundaries.set(L.lower);boundaries.set(L.upper,L.lower.length);
    const outline=new THREE.LineSegments(geometry(boundaries),new THREE.LineBasicMaterial({color:0x48717d,transparent:true,opacity:.35}));
    group.add(shell,outline,lines);group.userData={shell,outline,lines,id:i};groups.push(group);scene.add(group);
  });
  const ro=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});ro.observe(el);
  enableSliceDragging();
  $('loading').remove();renderer.setAnimationLoop(()=>{if(!sliceDrag)controls.update();renderer.render(scene,camera);});
}
function enableSliceDragging(){
  const canvas=renderer.domElement,raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  raycaster.params.Line.threshold=2;
  function ray(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);return raycaster.ray;}
  function finish(e,cancel=false){
    if(!sliceDrag||e.pointerId!==sliceDrag.pointerId)return;
    const d=sliceDrag;sliceDrag=null;controls.enabled=true;canvas.style.cursor='grab';
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    $('drag-status').hidden=true;
    if(!cancel&&d.moved&&d.target!==d.from)reorder(d.from,d.target,false);else update3D();
    if(cancel)feedback('Move cancelled. Your stack has not changed.');
  }
  canvas.addEventListener('pointerdown',e=>{
    if(sliceDrag){finish({pointerId:sliceDrag.pointerId},true);return;}
    if(e.button!==0||e.shiftKey||e.ctrlKey||e.metaKey)return;
    ray(e);
    const pickable=groups.filter(g=>g.visible).flatMap(g=>[g.userData.shell,g.userData.lines]);
    const hit=raycaster.intersectObjects(pickable,false)[0];if(!hit)return;
    const id=hit.object.parent.userData.id;select(id);
    document.querySelector(`.slice-row[data-id="${id}"]`).scrollIntoView({block:'nearest',inline:'nearest'});
    // A vertical plane through the picked point makes dragging follow world-up,
    // even after the specimen is rotated. Avoid a near-parallel top-down view.
    const normal=camera.getWorldDirection(new THREE.Vector3());normal.y=0;
    if(normal.lengthSq()<.01){feedback(`Slice ${labels[id]} selected. Tilt the view to drag it vertically.`);return;}
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal.normalize(),hit.point);
    sliceDrag={id,pointerId:e.pointerId,plane,startY:hit.point.y,from:order.indexOf(id),target:order.indexOf(id),startX:e.clientX,startScreenY:e.clientY,moved:false};
    controls.enabled=false;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';e.preventDefault();e.stopImmediatePropagation();
  },true);
  canvas.addEventListener('pointermove',e=>{
    if(!sliceDrag||sliceDrag.pointerId!==e.pointerId)return;
    const d=sliceDrag;const hit=ray(e).intersectPlane(d.plane,new THREE.Vector3());if(!hit)return;
    if(Math.hypot(e.clientX-d.startX,e.clientY-d.startScreenY)<5&&!d.moved)return;
    d.moved=true;const stride=manifest.slabThicknessMicrons+gap;
    const delta=THREE.MathUtils.clamp(hit.y-d.startY,-d.from*stride,(N-1-d.from)*stride);
    d.target=THREE.MathUtils.clamp(Math.round(d.from+delta/stride),0,N-1);
    const preview=[...order];preview.splice(d.from,1);preview.splice(d.target,0,d.id);
    groups.forEach((g,id)=>{g.position.y=(preview.indexOf(id)-(N-1)/2)*stride-manifest.layerData[id].centre;});
    groups[d.id].position.y=(d.from-(N-1)/2)*stride+delta-manifest.layerData[d.id].centre;
    $('drag-status').hidden=false;$('drag-status').textContent=`Slice ${labels[d.id]} → position ${d.target+1} / 15 · release to place`;
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  canvas.addEventListener('pointerup',e=>finish(e),true);
  canvas.addEventListener('pointercancel',e=>finish(e,true),true);
  canvas.addEventListener('lostpointercapture',e=>finish(e,true));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sliceDrag){finish({pointerId:sliceDrag.pointerId},true);}});
  canvas.style.cursor='grab';
}
function resetView(){if(!camera)return;camera.position.set(650,440,1050);controls.target.set(0,0,0);controls.update();}
function update3D(){if(!webgl)return;const isolate=$('isolate').checked;groups.forEach((g,id)=>{let pos=order.indexOf(id),target=(pos-(N-1)/2)*(manifest.slabThicknessMicrons+gap);g.position.y=target-manifest.layerData[id].centre;g.visible=!isolate||id===selected;const chosen=id===selected;g.userData.lines.material.opacity=isolate?1:chosen?1:.63;g.userData.shell.visible=$('shell').checked;g.userData.shell.material.opacity=chosen?.105:.026;g.userData.outline.visible=$('shell').checked;g.userData.outline.material.color.set(chosen?0xf6c878:0x537d8a);g.userData.outline.material.opacity=chosen?.95:.26;});$('view-title').textContent=isolate?`Slice ${labels[selected]} · isolated`:'Your assembled brain';}
function canvasSetup(canvas){const r=canvas.getBoundingClientRect(),w=Math.max(80,r.width),h=Math.max(56,r.height),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);return {ctx,w,h};}
function draw(canvas,id,kind='slab',other=null,thumb=false){
  const {ctx,w,h}=canvasSetup(canvas);ctx.fillStyle='#08151c';ctx.fillRect(0,0,w,h);
  if(id==null){ctx.fillStyle='#819aa7';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('Top of the stack',w/2,h/2);return;}
  const xspan=(manifest.bounds[0][1]-manifest.bounds[0][0])/1000,zspan=(manifest.bounds[1][1]-manifest.bounds[1][0])/1000;
  const scale=Math.min((w-16)/xspan,(h-24)/zspan),px=x=>w/2+x*scale,py=z=>h/2+z*scale;
  const L=layers[id];
  function outline(segments,col){ctx.strokeStyle=col;ctx.lineWidth=thumb?.65:1;ctx.beginPath();for(let i=0;i<segments.length;i+=6){ctx.moveTo(px(segments[i]),py(segments[i+2]));ctx.lineTo(px(segments[i+3]),py(segments[i+5]));}ctx.stroke();}
  outline(L[kind==='slab'?'contour':kind],other==null?'#668690':'#f6c878');
  if(kind==='slab'){
    ctx.lineWidth=thumb?.45:.6;ctx.globalAlpha=thumb?.8:.85;
    // Group paths by neuron so the published branching remains intact.
    let current=-1;const s=L.segments;
    for(let i=0;i<s.length;i+=7){let c=s[i+6]%colours.length;if(c!==current){ctx.stroke();ctx.beginPath();ctx.strokeStyle=colours[c];current=c;}ctx.moveTo(px(s[i]),py(s[i+2]));ctx.lineTo(px(s[i+3]),py(s[i+5]));}ctx.stroke();ctx.globalAlpha=1;
  }else{
    const y=(manifest.layerData[id].centre+(kind==='lower'?-1:1)*manifest.slabThicknessMicrons/2);
    function points(layer,height,col,ring){const s=layer.segments;for(let i=0;i<s.length;i+=7){for(let o of [0,3])if(Math.abs(s[i+o+1]-height)<.0001){ctx.beginPath();ctx.strokeStyle=col||colours[s[i+6]%colours.length];ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=1;ctx.arc(px(s[i+o]),py(s[i+o+2]),ring?2.5:1.6,0,Math.PI*2);ring?ctx.stroke():ctx.fill();}}}
    points(L,y,other==null?null:'#f6c878',false);
    if(other!=null){const O=layers[other];outline(O.lower,'#76e9d288');points(O,manifest.layerData[other].centre-manifest.slabThicknessMicrons/2,'#76e9d2',true);}
  }
  if(!thumb){const bar=100*scale;ctx.strokeStyle='#91a9b6';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w-14-bar,h-17);ctx.lineTo(w-14,h-17);ctx.stroke();ctx.fillStyle='#91a9b6';ctx.font='10px sans-serif';ctx.textAlign='right';ctx.fillText('100 µm',w-14,h-23);}
}
let listDrag=null;
let listPointer=null,suppressListClick=false;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&listPointer)$('stack').onkeydown(e);});
function finishListDrag(commit=false){
  const d=listDrag;if(!d)return;
  const destination=N-1-d.slot;
  listDrag=null;dragged=null;cancelAnimationFrame(d.frame);
  d.source.classList.remove('drag-source');d.placeholder.remove();d.ghost.remove();
  $('stack').classList.remove('reordering');
  if(commit)reorder(order.indexOf(d.id),destination);
}
function positionListGap(clientY){
  const d=listDrag;if(!d)return;d.clientY=clientY;
  const gapRect=d.placeholder.getBoundingClientRect();
  if(clientY>=gapRect.top&&clientY<=gapRect.bottom)return;
  const rows=[...$('stack').querySelectorAll('.slice-row')].filter(row=>row!==d.source);
  let slot=rows.findIndex(row=>{const r=row.getBoundingClientRect();return clientY<r.top+r.height/2;});
  if(slot<0)slot=rows.length;
  if(slot!==d.slot){d.slot=slot;$('stack').insertBefore(d.placeholder,rows[slot]||null);}
}
function beginListDrag(e,id,source){
  finishListDrag();dragged=id;
  const rect=source.getBoundingClientRect(),ghost=source.cloneNode(true);
  ghost.className='slice-row drag-ghost';ghost.style.width=rect.width+'px';ghost.setAttribute('aria-hidden','true');
  document.body.appendChild(ghost);ghost.querySelector('canvas').getContext('2d').drawImage(source.querySelector('canvas'),0,0);
  const placeholder=document.createElement('li');placeholder.className='slice-gap';
  placeholder.setAttribute('aria-hidden','true');placeholder.textContent=`Place slice ${labels[id]} here`;
  source.before(placeholder);
  const d=listDrag={id,source,placeholder,ghost,slot:N-1-order.indexOf(id),clientY:e.clientY,frame:0};
  source.classList.add('drag-source');$('stack').classList.add('reordering');
  function scroll(){
    if(listDrag!==d)return;const list=$('stack'),r=list.getBoundingClientRect();
    const inside=d.clientY>=r.top&&d.clientY<=r.bottom;
    const speed=!inside?0:d.clientY<r.top+38?-Math.min(9,(r.top+38-d.clientY)/4):d.clientY>r.bottom-38?Math.min(9,(d.clientY-r.bottom+38)/4):0;
    if(speed){const before=list.scrollTop;list.scrollTop+=speed;if(before!==list.scrollTop)positionListGap(d.clientY);}
    d.frame=requestAnimationFrame(scroll);
  }
  d.frame=requestAnimationFrame(scroll);
}
function renderStack(){
  finishListDrag();const container=$('stack');container.replaceChildren();
  container.onpointerdown=e=>{
    if(e.button!==0||listPointer)return;const source=e.target.closest('.slice-row');if(!source)return;
    if(e.pointerType==='touch'&&!e.target.closest('.grip'))return;
    listPointer={id:+source.dataset.id,source,pointerId:e.pointerId,x:e.clientX,y:e.clientY};
    if(e.pointerType!=='touch')e.preventDefault();container.setPointerCapture(e.pointerId);
  };
  container.onpointermove=e=>{
    const p=listPointer;if(!p||p.pointerId!==e.pointerId)return;
    if(!listDrag&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<6)return;
    if(!listDrag)beginListDrag(e,p.id,p.source);
    const d=listDrag,r=container.getBoundingClientRect();
    d.ghost.style.left=(e.clientX-d.ghost.offsetWidth/2)+'px';d.ghost.style.top=(e.clientY-36)+'px';
    const inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
    if(inside)positionListGap(e.clientY);else d.clientY=-Infinity;
    e.preventDefault();
  };
  function end(e,cancel){
    const p=listPointer;if(!p||p.pointerId!==e.pointerId)return;listPointer=null;
    if(container.hasPointerCapture(e.pointerId))container.releasePointerCapture(e.pointerId);
    const r=container.getBoundingClientRect(),inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
    if(listDrag){suppressListClick=true;finishListDrag(!cancel&&inside);setTimeout(()=>suppressListClick=false,0);}
    else if(!cancel)select(p.id);
  }
  container.onpointerup=e=>end(e,false);container.onpointercancel=e=>end(e,true);container.onlostpointercapture=e=>end(e,true);
  container.onkeydown=e=>{if(e.key==='Escape'&&listPointer){end({pointerId:listPointer.pointerId},true);e.preventDefault();}};
  container.onclick=e=>{if(suppressListClick){e.preventDefault();e.stopPropagation();}};
  [...order].reverse().forEach((id,visualPos)=>{
    const pos=N-1-visualPos,li=document.createElement('li');
    li.className='slice-row'+(id===selected?' selected':'')+(checked&&id===pos?' correct':'');li.draggable=false;li.dataset.id=id;
    li.innerHTML=`<button aria-label="Slot ${pos+1}, slice ${labels[id]}. Select to inspect or move." aria-pressed="${id===selected}"><span class="slot">${String(pos+1).padStart(2,'0')}</span><canvas aria-hidden="true"></canvas><span class="slice-name">Slice ${labels[id]}</span><span class="grip" aria-hidden="true">⠿</span></button>`;
    li.querySelector('button').onclick=()=>{if(!suppressListClick)select(id);};
    li.addEventListener('keydown',e=>{if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();selected=id;move(e.key==='ArrowUp'?1:-1);}});
    container.appendChild(li);draw(li.querySelector('canvas'),id,'slab',null,true);
  });
}
function select(id){selected=id;document.querySelectorAll('.slice-row').forEach(el=>{const on=+el.dataset.id===id;el.classList.toggle('selected',on);el.querySelector('button').setAttribute('aria-pressed',on);});update();}
function updateInspector(){let pos=order.indexOf(selected),next=order[pos+1];$('inspect-title').textContent=`Slice ${labels[selected]}`;$('slice-chip').textContent=labels[selected];$('inspect-subtitle').textContent=`Position ${pos+1} of 15 · bottom to top`;
  $('first-label').textContent=overlay?'OVERLAY · SELECTED TOP + NEXT BOTTOM':mode==='slab'?`SLICE ${labels[selected]} · WHOLE SLAB`:`SLICE ${labels[selected]} · TOP FACE`;
  $('second-label').textContent=next==null?'END OF STACK':mode==='slab'?`SLICE ${labels[next]} · WHOLE SLAB`:`SLICE ${labels[next]} · BOTTOM FACE`;
  $('overlay').disabled=next==null;$('overlay').setAttribute('aria-pressed',overlay);$('overlay').textContent=overlay?'Hide face overlay':'Overlay the joining faces';
  $('inspect-help').textContent=overlay?'Gold dots: this slice. Mint rings: the next slice. At the correct join, every dot sits inside a ring and the outlines align.':mode==='slab'?'Each neuron keeps its colour across slices; colours repeat across neurons. Look for continuing branches and a changing brain outline.':'These are actual cut faces. Match the outline and the coloured branch endpoints at the same positions.';
  draw($('scan-a'),selected,overlay?'upper':mode==='slab'?'slab':'upper',overlay?next:null);draw($('scan-b'),next,mode==='slab'?'slab':'lower');
  $('join-label').textContent=next==null?'No slice above this one':`Join ${labels[selected]} → ${labels[next]}`;
}
function update(){update3D();updateInspector();const p=order.indexOf(selected);$('down').disabled=p===0;$('up').disabled=p===N-1;}
function reorder(from,to,focus=true){if(from<0||to<0||to>=N||from===to)return;const [id]=order.splice(from,1);order.splice(to,0,id);selected=id;checked=false;reference=false;feedback('Stack updated. Inspect the joining faces, then check your order.');renderStack();update();const row=document.querySelector(`.slice-row[data-id="${selected}"] button`);if(focus)row.focus({preventScroll:true});row.scrollIntoView({block:'nearest',inline:'nearest'});}
function move(delta){const p=order.indexOf(selected);reorder(p,p+delta);document.querySelector(`.slice-row[data-id="${selected}"]`).scrollIntoView({block:'nearest',inline:'nearest'});}
function shuffle(){order=randomOrder();if(order.every((id,i)=>id===i))order.reverse();labels=Array(N);randomOrder().forEach((id,i)=>labels[id]=String.fromCharCode(65+i));selected=order[0];checked=false;reference=false;overlay=false;feedback('15 slices, one continuous brain. Select a slice to inspect it; move it to reconnect the branches.');renderStack();update();$('stack').scrollTop=0;$('stack').scrollLeft=0;}
function check(){checked=true;const correct=order.filter((id,i)=>id===i).length,joins=order.slice(0,-1).filter((id,i)=>order[i+1]===id+1).length;
 if(correct===N){feedback(reference?'Reference order · all 14 joins connect. Shuffle to try the puzzle yourself.':'Brain reconstructed! All 15 slices are in place and all 14 joins reconnect.','good');}
 else feedback(`${correct} / 15 slices in place · ${joins} / 14 joins connect. ${joins?'Keep the continuous runs together.':'Try comparing the joining faces.'}`,'warn');renderStack();update();}
async function init(){try{
 manifest=await (await fetchOK('data/manifest.json')).json();
 layers=await Promise.all(Array.from({length:N},async(_,i)=>readLayer(await (await fetchOK(`data/layer-${i}.bin`)).arrayBuffer())));
 $('data-count').textContent=`${manifest.neurons.length} real neurons · FAFB v783`;$('source-neurons').textContent=manifest.neurons.length;$('thickness').textContent=`${manifest.slabThicknessMicrons.toFixed(2)} µm`;
 renderNeuronSources();setup3D();shuffle();
 $('shuffle').onclick=shuffle;$('check').onclick=check;$('up').onclick=()=>move(1);$('down').onclick=()=>move(-1);$('reset-view').onclick=resetView;
 $('gap').oninput=e=>{gap=+e.target.value;$('gap-value').textContent=`${gap} µm`;update3D();};$('shell').onchange=update3D;$('isolate').onchange=update3D;
 $('slab-mode').onclick=()=>setMode('slab');$('seam-mode').onclick=()=>setMode('seam');$('overlay').onclick=()=>{overlay=!overlay;updateInspector();};
 $('solution').onclick=()=>{order=Array.from({length:N},(_,i)=>i);reference=true;checked=true;gap=0;$('gap').value=0;$('gap-value').textContent='0 µm';$('isolate').checked=false;feedback('Reference order shown · all branches reconnect. Shuffle to start a new challenge.','good');renderStack();update();};
 new ResizeObserver(()=>{updateInspector();document.querySelectorAll('.slice-row').forEach(e=>draw(e.querySelector('canvas'),+e.dataset.id,'slab',null,true));}).observe($('scan-a'));
 window.layerLab={getState:()=>({order:[...order],selected,checked,reference,labels:[...labels],webgl}),manifest};
 }catch(e){feedback('The specimen could not load. Refresh to retry. '+e.message,'warn');$('loading').textContent='Data loading failed';console.error(e);}}
function setMode(value){mode=value;overlay=false;for(const [id,m] of [['slab-mode','slab'],['seam-mode','seam']]){$(id).classList.toggle('active',mode===m);$(id).setAttribute('aria-pressed',mode===m);}updateInspector();}
function renderNeuronSources(){
  const body=$('neuron-rows');
  manifest.neurons.forEach(n=>{const row=document.createElement('tr');for(const value of [n.id,n.type,n.class,n.side||'—']){const td=document.createElement('td');td.textContent=value;row.appendChild(td);}const td=document.createElement('td'),a=document.createElement('a');a.href=n.url;a.textContent='Skeleton';a.target='_blank';a.rel='noreferrer';td.appendChild(a);row.appendChild(td);body.appendChild(row);});
}
$('about').onclick=()=>$('sources').showModal();$('close-sources').onclick=()=>$('sources').close();$('sources').addEventListener('click',e=>{if(e.target===$('sources')){const r=$('sources').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('sources').close();}});
init();
