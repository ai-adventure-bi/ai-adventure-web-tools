import {sharedRequest,allRecords,hasAdminSession,rememberAdminSession,forgetAdminSession} from './shared-storage.js';
import {buildThemeGeometry,forms,themeDefaults} from './themes.js';
import {validateRecipe as validate} from './recipe-validation.js';
import {outlineNames,alienNames,classicHandles,validateExperimental,upgradeRecipe,experimentalOutline,experimentalLift,classicHandleRadius,balanceExperimental} from './experimental.js';


import {validateDesign,defaultDesign} from './design.js';

import {installStudio} from './studio.js';

let studio;

import * as THREE from 'three';

import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

import {STLExporter} from 'three/addons/exporters/STLExporter.js';

import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';



const DEFAULT={...themeDefaults,toyType:'top',experimentalEnabled:false,outlineStyle:'round',outlineAmount:80,alienStyle:'none',alienAmount:50,complexity:65,designSeed:4837,bodyTheme:'none',themeAmount:4,themeSize:4,bodyDiameter:60,bodyHeight:20,stemHeight:25,stemDiameter:9,tipLength:8,rimStyle:'spiky',rimPattern:'hooked',rimSweep:7,armSpiral:10,armReach:9,bodyCrownStyle:'jewelled',bodyCrownSize:6,bodyCrownHeight:5,bodyCrownLobes:10,bodyCrownTwist:2,handleStyle:'spire',pommelStyle:'crystal',hubStyle:'smooth',hubHeight:3,hubDepth:2,hubLobes:8,hubTwist:0,lobes:6,waveDepth:7,rimLift:3,secondaryLobes:12,twist:4,handleTwist:5,handleFins:4,handleFlare:4,holes:0,holeSize:3,topperStyle:'none',topperHeight:24,topperWidth:18,topperFeatures:6,topperTwist:2,topperRelief:4,color:'#8e6df2'};

const PRESETS={top:DEFAULT};

const rules={complexity:[0,100],designSeed:[0,9999],themeAmount:[0,10],themeSize:[0,10],bodyDiameter:[25,65],bodyHeight:[8,30],stemHeight:[8,34],stemDiameter:[5,12],tipLength:[3,12],rimSweep:[-10,10],armSpiral:[-12,12],armReach:[0,10],bodyCrownSize:[0,10],bodyCrownHeight:[0,8],bodyCrownLobes:[3,18],bodyCrownTwist:[-10,10],hubHeight:[0,12],hubDepth:[0,8],hubLobes:[3,16],hubTwist:[-10,10],lobes:[0,16],waveDepth:[0,10],rimLift:[0,10],secondaryLobes:[0,24],twist:[0,10],handleTwist:[0,10],handleFins:[0,12],handleFlare:[0,10],holes:[0,20],holeSize:[2,7],topperHeight:[14,34],topperWidth:[10,25],topperFeatures:[3,12],topperTwist:[-10,10],topperRelief:[0,7]};

const styles=['smooth','wavy','scalloped','spiky','organic','petal','enchanted','crystal'];

const rimPatterns=['radial','turbine','hooked','comet','claw'];

const handles=[...classicHandles,'straight','flared','mushroom','twisted','crown','spire','chalice','vine','winged'];

const pommels=['simple','orb','crystal','flame','crown'];

const hubs=['smooth','crown','petal','gear','crystal','halo'];

const bodyCrowns=['none','jewelled','tiara','petals','crystal','runes'];

const topperStyles=['none','dolphinTail','tentacle','trident','coral','skull','cyclops','mushroom','robot','ghost','crystal'];

const bodyThemes=['none','coral','scales','bubbles','armour','craters','mushrooms'];

const editor=document.querySelector('#json'), message=document.querySelector('#message');

editor.value=JSON.stringify(DEFAULT,null,2);



const canvas=document.querySelector('#view');

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.shadowMap.enabled=true;

const scene=new THREE.Scene(); scene.background=new THREE.Color(0xebe9dc);

const camera=new THREE.PerspectiveCamera(38,1,.1,500); camera.position.set(100,65,120);

const controls=new OrbitControls(camera,canvas); controls.enableDamping=true; controls.target.set(0,20,0); controls.minDistance=45;controls.maxDistance=210;

scene.add(new THREE.HemisphereLight(0xffffff,0x665848,2.1)); const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(50,80,45);key.castShadow=true;scene.add(key);

const floor=new THREE.Mesh(new THREE.CircleGeometry(100,96),new THREE.MeshStandardMaterial({color:0xd9d6c7,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-8.02;floor.receiveShadow=true;scene.add(floor);

const grid=new THREE.GridHelper(160,16,0xa6aa9f,0xc8c8bc);grid.position.y=-7.98;scene.add(grid);

const precessionGroup=new THREE.Group(),tiltGroup=new THREE.Group(),topGroup=new THREE.Group();precessionGroup.add(tiltGroup);tiltGroup.add(topGroup);scene.add(precessionGroup);let currentMesh,current=DEFAULT,isSpinning=false;



function radialStyle(style,a,lobes,depth,twist,zNorm,secondary=0){

  if(style==='smooth'||lobes===0||depth===0)return 0;

  const phase=a*lobes + twist*.16*zNorm;

  if(style==='wavy')return depth*Math.sin(phase);

  if(style==='scalloped')return -depth*(.5+.5*Math.cos(phase));

  if(style==='spiky')return depth*(.72*Math.pow(.5+.5*Math.cos(phase),2)-.22);

  if(style==='petal')return depth*(.72*Math.cos(phase)+.28*Math.cos(phase*2));

  if(style==='crystal')return depth*(2/Math.PI*Math.asin(Math.sin(phase)));

  if(style==='enchanted')return depth*(.62*Math.sin(phase)+.25*Math.sin(a*Math.max(2,secondary)+twist)+.13*Math.sin(a*3-1));

  return depth*(.58*Math.sin(phase)+.27*Math.sin(a*(lobes+2)-1.7)+.15*Math.sin(a*3+twist));

}

function topRimWave(p,a,t){if(p.rimStyle==='smooth')return 0;const inner=Math.max(0,(t-.5)*2),spiral=p.armSpiral*inner*(p.armReach/10),phase=a*Math.max(1,p.lobes)+p.twist*.16*t+spiral;if(p.rimPattern==='radial'||!p.rimSweep)return radialStyle(p.rimStyle,a+spiral/Math.max(1,p.lobes),p.lobes,p.waveDepth,p.twist,t,p.secondaryLobes);const s=p.rimSweep/10,d=p.waveDepth;let v;if(p.rimPattern==='turbine')v=.62*Math.sin(phase)+.38*s*Math.sin(phase*2-Math.PI/2);else if(p.rimPattern==='hooked'){const c=Math.max(0,Math.cos(phase));v=Math.pow(c,4)-.22+s*.72*Math.sin(phase)*c*c;}else if(p.rimPattern==='comet'){const u=((phase/(Math.PI*2))%1+1)%1;v=(1-2*u)*s+.22*Math.sin(phase);}else{v=.55*Math.sin(phase)+.45*s*Math.sin(phase*2+.7);}return .55*d*v+.45*radialStyle(p.rimStyle,a+spiral/Math.max(1,p.lobes),p.lobes,p.waveDepth,p.twist,t,p.secondaryLobes);}

function bodyCrownFeature(p,a,t){if(p.bodyCrownStyle==='none'||t<.58)return {radial:0,lift:0};const band=Math.exp(-Math.pow((t-.78)/.115,2)),phase=a*p.bodyCrownLobes+p.bodyCrownTwist*t*.2;let jewel=0;if(p.bodyCrownStyle==='jewelled')jewel=Math.pow(Math.max(0,Math.cos(phase)),8);if(p.bodyCrownStyle==='tiara')jewel=.25+.75*Math.pow(Math.max(0,Math.cos(phase)),5);if(p.bodyCrownStyle==='petals')jewel=.5+.5*Math.sin(phase);if(p.bodyCrownStyle==='crystal')jewel=Math.abs(2/Math.PI*Math.asin(Math.sin(phase)));if(p.bodyCrownStyle==='runes')jewel=.35+.65*Math.pow(Math.abs(Math.sin(phase*1.5)),6);return {radial:p.bodyCrownSize*.32*band*jewel,lift:p.bodyCrownHeight*band*jewel};}

function themedBodyFeature(p,a,t){if(p.bodyTheme==='none'||!p.themeAmount)return {radial:0,lift:0};const seed=p.designSeed*.0174533,amount=Math.min(1.15,p.themeAmount*.115),upper=Math.pow(Math.max(0,Math.sin(Math.PI*t)),2);let radial=0,lift=0;if(p.bodyTheme==='coral'){/* Coral is built as clean attached ornament below; keep the core calm. */}else if(p.bodyTheme==='bubbles'){const phase=a*(5+Math.round(p.themeSize*.45))+seed+t*8;radial=amount*.48*Math.pow(Math.max(0,Math.cos(phase)),6)*upper;}else if(p.bodyTheme==='scales'){radial=amount*.34*Math.sin(a*(6+Math.round(p.themeSize*.45))+t*9+seed)*upper;}else if(p.bodyTheme==='armour'){radial=amount*.3*(2/Math.PI*Math.asin(Math.sin(a*(4+Math.round(p.themeSize*.35))+t*3+seed)))*upper;}else if(p.bodyTheme==='craters'){const phase=a*(5+Math.round(p.themeSize*.4))+seed+t*7;radial=-amount*.42*Math.pow(Math.max(0,Math.cos(phase)),8)*upper;}else{const caps=Math.pow(Math.max(0,Math.cos(a*(4+Math.round(p.themeSize*.35))+seed)),6)*Math.exp(-Math.pow((t-.74)/.18,2));radial=amount*.42*caps;lift=amount*.28*caps;}return {radial,lift};}

function hubRadius(p,a,t){
 const r=p.stemDiameter/2,u=Math.max(0,Math.min(1,t)),envelope=Math.sin(Math.PI*u)**2;
 // Broad sinusoidal lobes with a smooth join at both ends. Thin hubs get less relief.
 const depth=Math.min(p.hubDepth,2.8,p.hubHeight*.38),lobes=Math.max(3,Math.min(8,p.hubLobes));
 const phase=a*lobes+(1-u)*(1.2+p.hubTwist*.12);
 const wave=.5+.5*Math.cos(phase),second=.5+.5*Math.sin(phase+Math.sin(Math.PI*u)*.7);
 const ornament=p.hubStyle==='smooth'?.28:p.hubStyle==='halo'?.8:p.hubStyle==='petal'?.45+.45*wave:p.hubStyle==='gear'?.5+.35*wave:p.hubStyle==='crystal'?.42+.38*second:.4+.45*second;
 return r+depth*envelope*ornament;
}

function handleRadius(style,t,p,a){const r=p.stemDiameter/2,flare=p.handleFlare*.09,c=p.complexity/100;let base=r;if(style==='straight')base=r*(1-.08*t);if(style==='flared')base=r*(.8+.45*t*t+flare*t);if(style==='mushroom')base=r*(.78+(.8+flare)*Math.pow(Math.sin(Math.PI*t/2),5));if(style==='twisted')base=r*(.86+.18*Math.sin(a*3+p.handleTwist*t));if(style==='crown')base=r*(.8+.38*t*t);if(style==='spire')base=r*(1.02-.42*t+.34*Math.sin(Math.PI*t));if(style==='chalice')base=r*(.74+.62*Math.pow(Math.abs(2*t-1),1.7)+flare*t);if(style==='vine')base=r*(.78+.14*Math.sin(a*3+p.handleTwist*t*1.4)+.18*Math.sin(Math.PI*t));if(style==='winged')base=r*(.76+.18*Math.sin(Math.PI*t));const fins=p.handleFins?Math.pow(Math.max(0,Math.cos(a*p.handleFins+p.handleTwist*t*.35)),7)*p.handleFlare*.17*Math.sin(Math.PI*t):0;let pommel=0;if(t>.72&&p.topperStyle==='none'){const u=(t-.72)/.28;if(p.pommelStyle==='orb')pommel=r*.65*Math.sin(Math.PI*u);if(p.pommelStyle==='crystal')pommel=r*.62*(1-Math.abs(2*u-1));if(p.pommelStyle==='flame')pommel=r*.5*Math.sin(Math.PI*u)*(1-u*.55);if(p.pommelStyle==='crown')pommel=r*.5*Math.pow(Math.max(0,Math.cos(a*Math.max(4,p.handleFins))),6)*u;}if(classicHandles.includes(style)){base=classicHandleRadius(style,t,r,a);pommel=0;}const fancy=Math.max(r*.45,base+fins+pommel);return r+(fancy-r)*c;}

function handleCharacterRadius(p,t,a,base){if(p.topperStyle==='none'||p.topperStyle==='dolphinTail')return base;const strength=Math.min(p.topperRelief,5)*.16,wide=Math.min(p.topperWidth,p.stemDiameter*2.1),phase=a*Math.max(2,p.topperFeatures)+p.topperTwist*t*.16,band=(centre,width)=>Math.exp(-Math.pow((t-centre)/width,2));let add=0;if(p.topperStyle==='tentacle')add=strength*(.45+.55*Math.sin(phase))*Math.sin(Math.PI*t);else if(p.topperStyle==='trident')add=wide*.12*Math.pow(Math.max(0,Math.cos(a*3)),3)*band(.72,.2);else if(p.topperStyle==='coral')add=strength*(.4+.6*Math.pow(Math.max(0,Math.cos(phase)),3))*band(.58,.28);else if(p.topperStyle==='skull')add=wide*.1*band(.62,.2);else if(p.topperStyle==='cyclops')add=wide*.1*band(.6,.2);else if(p.topperStyle==='mushroom')add=wide*.16*band(.74,.14);else if(p.topperStyle==='robot')add=wide*.09*band(.58,.26);else if(p.topperStyle==='ghost')add=wide*.09*band(.58,.27);else add=wide*.1*band(.62,.24);return Math.max(p.stemDiameter*.38,Math.min(base+add,p.stemDiameter*.5+wide*.28));}



function transformed(geometry,position,rotation={x:0,y:0,z:0},scale={x:1,y:1,z:1}){geometry.scale(scale.x,scale.y,scale.z);geometry.rotateX(rotation.x);geometry.rotateY(rotation.y);geometry.rotateZ(rotation.z);geometry.translate(position.x,position.y,position.z);return geometry;}

function dolphinTailGeometry(width,depth){const s=width/20,shape=new THREE.Shape();shape.moveTo(0,-3*s);shape.bezierCurveTo(-1.8*s,-1.2*s,-4.6*s,.5*s,-9.4*s,2.7*s);shape.bezierCurveTo(-10.8*s,3.4*s,-10.8*s,5.7*s,-9.8*s,7.2*s);shape.bezierCurveTo(-6.2*s,6.7*s,-2.8*s,5.6*s,0,3.1*s);shape.bezierCurveTo(2.8*s,5.6*s,6.2*s,6.7*s,9.8*s,7.2*s);shape.bezierCurveTo(10.8*s,5.7*s,10.8*s,3.4*s,9.4*s,2.7*s);shape.bezierCurveTo(4.6*s,.5*s,1.8*s,-1.2*s,0,-3*s);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelThickness:.65,bevelSize:.65,bevelSegments:3,curveSegments:18});g.center();return g;}

function figurativeDetails(p,bodyTop,handleBase){const parts=[],c=p.complexity/100,detail=p.themeAmount*c;if(p.bodyTheme==='coral'&&detail>.25){const count=Math.max(5,Math.min(10,Math.round(4+p.themeSize*.55))),R=p.bodyDiameter/2,seed=p.designSeed*.011,branchR=Math.min(2.1,1.05+detail*.11),shoulderY=bodyTop*.68;/* A continuous ornamental reef band anchors every branch visibly to the outer shoulder. */const band=new THREE.TorusGeometry(R*.86,Math.max(.7,branchR*.48),10,96);parts.push(transformed(band,{x:0,y:shoulderY,z:0},{x:Math.PI/2,y:0,z:0}));for(let i=0;i<count;i++){const a=i/count*Math.PI*2,variation=.88+.12*Math.sin(seed+i*2.17),length=Math.min(6,2.8+p.themeSize*.28)*variation,rad=R*.84;const branch=new THREE.CapsuleGeometry(branchR,length,5,12),x=Math.cos(a)*rad,z=Math.sin(a)*rad;parts.push(transformed(branch,{x,y:shoulderY+length*.34,z},{x:Math.sin(a)*.18,y:0,z:-Math.cos(a)*.18}));/* paired buds give a recognisable branching-coral silhouette without fragile needles */const budR=branchR*1.05,budY=shoulderY+length*.72;for(const side of [-1,1]){const bud=new THREE.SphereGeometry(budR,14,10),ba=a+side*.18,budRad=R*.88;parts.push(transformed(bud,{x:Math.cos(ba)*budRad,y:budY,z:Math.sin(ba)*budRad},{},{x:1,y:.82,z:1}));}}}

if(p.topperStyle==='dolphinTail'){const width=Math.max(15,Math.min(p.topperWidth,22))*Math.max(.72,c),depth=Math.max(2.8,p.stemDiameter*.38),share=Math.min(.72,Math.max(.45,p.topperHeight/42)),zone=p.stemHeight*share,top=handleBase+p.stemHeight,tail=dolphinTailGeometry(width,depth);tail.computeBoundingBox();const low=tail.boundingBox.min.y,high=tail.boundingBox.max.y;tail.translate(0,-low,0);tail.scale(1,(zone+3)/(high-low),1);tail.translate(0,top-zone-3,0);parts.push(tail);}


return parts;}

function verticalWave(p,a,t){if(!p.rimLift||p.lobes===0)return 0;const middle=Math.pow(Math.sin(Math.PI*t),4);const phase=a*p.lobes+p.twist*.16*t;if(p.rimStyle==='spiky'||p.rimStyle==='crystal')return p.rimLift*Math.pow(Math.max(0,Math.cos(phase)),3)*middle;return p.rimLift*Math.sin(phase)*middle;}

function holeDimple(a,p){

  if(!p.holes)return 0; let best=0;

  for(let h=0;h<p.holes;h++){const ha=h/p.holes*Math.PI*2+.25;let d=Math.abs(Math.atan2(Math.sin(a-ha),Math.cos(a-ha)));const width=.035+p.holeSize/(p.bodyDiameter*1.7);best=Math.max(best,Math.exp(-(d*d)/(2*width*width)));}

  return best*p.holeSize*.44;

}

function topperRadius(p,t,a){const W=p.topperWidth/2,f=p.topperFeatures,phase=a*f+p.topperTwist*t*.25,rel=p.topperRelief;let r;if(p.topperStyle==='mushroom'){r=t<.48?W*.32:W*Math.pow(Math.max(0,Math.sin((t-.45)/.55*Math.PI)),.42);if(t>.92)r*=Math.max(0,(1-t)/.08);}else if(p.topperStyle==='robot'){r=W*(t<.14?.55:t<.72?1:t<.88?.74:Math.max(0,(1-t)/.12)*.74);r+=rel*.22*Math.pow(Math.abs(Math.cos(phase)),10);}else if(p.topperStyle==='ghost'){r=W*(.72+.18*Math.sin(Math.PI*t))*(1-Math.pow(t,7));if(t<.2)r+=rel*.35*Math.sin(phase);}else if(p.topperStyle==='crystal'){r=W*(t<.68?.58+.42*t/.68:Math.max(0,(1-t)/.32));r+=rel*.28*Math.abs(2/Math.PI*Math.asin(Math.sin(phase)));}else if(p.topperStyle==='skull'){const cranium=.36+.72*Math.exp(-Math.pow((t-.68)/.27,2)),jaw=t<.42?.24*(1-t/.42):0;r=W*(cranium+jaw)*(1-Math.pow(t,9));if(t<.34)r+=rel*.26*Math.pow(Math.max(0,Math.cos(phase)),8);if(t>.38&&t<.7)r-=rel*.18*Math.pow(Math.max(0,Math.cos(phase)),6);}else{r=W*Math.pow(Math.max(0,Math.sin(Math.PI*t)),.43);r-=rel*.16*Math.pow(Math.max(0,Math.cos(phase)),8)*Math.sin(Math.PI*t);}return Math.max(0,r);}

function integratedTotemRadius(p,t,a,joinRadius){let raw=topperRadius(p,t,a);const phase=a*Math.max(3,p.topperFeatures)+p.topperTwist*t*.28,envelope=Math.sin(Math.PI*t);if(p.topperStyle==='trident')raw*=.82+.34*Math.pow(Math.max(0,Math.cos(a*3)),4);if(p.topperStyle==='coral')raw*=.86+.24*Math.pow(Math.max(0,Math.cos(phase)),4);if(p.topperStyle==='tentacle')raw*=.9+.16*Math.sin(phase);if(p.topperStyle==='cyclops')raw*=.9+.12*Math.cos(a*2)*envelope;if(t>.92)raw*=Math.max(0,(1-t)/.08);const u=Math.min(1,t/.18),blend=u*u*(3-2*u);return Math.max(0,joinRadius*(1-blend)+raw*blend);}

function effectiveParams(p){const c=p.complexity/100,q={...p};if(p.toyType==='top'){q.alienAmount=(p.alienAmount??50)*c;for(const k of ['waveDepth','rimLift','rimSweep','armSpiral','bodyCrownSize','bodyCrownHeight','bodyCrownTwist','hubHeight','hubDepth','hubTwist','handleTwist','handleFlare','topperTwist','topperRelief','themeAmount','themeSize'])q[k]=p[k]*c;q.waveDepth=Math.min(q.waveDepth,Math.max(2.5,p.bodyDiameter*.1));q.rimLift=Math.min(q.rimLift,5.5);q.bodyCrownHeight=Math.min(q.bodyCrownHeight,4.2);q.armReach=Math.min(p.armReach*c,9);q.handleFins=Math.min(7,Math.round(p.handleFins*c));q.holes=Math.round(p.holes*c);if(q.topperStyle!=='none'){q.stemDiameter=Math.max(q.stemDiameter,9);q.pommelStyle='simple';q.handleFins=Math.min(q.handleFins,3);}if(c===0){q.rimStyle='smooth';q.rimPattern='radial';q.bodyCrownStyle='none';q.bodyTheme='none';q.handleStyle='straight';q.pommelStyle='simple';q.hubStyle='smooth';q.topperStyle='none';}}return q;}

function buildGeometry(p, preview = false){
  if(p.theme!=='atlantis')return buildThemeGeometry(p, preview);

  const seg=192, rings=[]; const R=p.bodyDiameter/2, bodyBottom=0, bodyTop=p.bodyHeight;

  rings.push({y:-p.tipLength,r:0,kind:'circle'});rings.push({y:-p.tipLength+.7,r:Math.max(.35,p.stemDiameter*.12),kind:'circle'});rings.push({y:0,r:p.stemDiameter*.43,kind:'circle'});

  const bodyRings=p.experimentalEnabled?48:22;

  for(let j=0;j<=bodyRings;j++){const t=j/bodyRings;const bulge=Math.pow(Math.sin(Math.PI*t),.58);const base=p.stemDiameter*.43+(R-p.stemDiameter*.43)*bulge;rings.push({y:bodyBottom+t*p.bodyHeight,r:base,kind:'body',t});}

  const hubRings=12;if(p.hubHeight>0)for(let j=1;j<=hubRings;j++){const t=j/hubRings;rings.push({y:bodyTop+t*p.hubHeight,r:p.stemDiameter/2,kind:'hub',t});}

  const handleBase=bodyTop+p.hubHeight,hasTotem=p.topperStyle!=='none',isTail=p.topperStyle==='dolphinTail',ornamentShare=hasTotem?Math.min(.72,Math.max(.45,p.topperHeight/42)):0,gripShare=hasTotem?1-ornamentShare:1,gripHeight=p.stemHeight*gripShare,handleRings=hasTotem?16:28;for(let j=1;j<=handleRings;j++){const t=j/handleRings;rings.push({y:handleBase+t*gripHeight,r:p.stemDiameter/2,kind:'handle',t});}const gripTop=handleBase+gripHeight;if(hasTotem&&!isTail){const totemRings=30;for(let j=1;j<=totemRings;j++){const t=j/totemRings;rings.push({y:gripTop+t*(p.stemHeight-gripHeight),r:p.stemDiameter/2,kind:'totem',t});}}else{rings.push({y:gripTop,r:p.stemDiameter*.28,kind:'circle'});rings.push({y:gripTop,r:0,kind:'circle'});}

  const pos=[],uv=[],idx=[];

  for(let j=0;j<rings.length;j++){const q=rings[j];for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2;let rad=q.r,y=q.y;if(q.kind==='body'){rad=p.stemDiameter*.43+(rad-p.stemDiameter*.43)*experimentalOutline(p,a);const baseEnvelope=Math.pow(Math.sin(Math.PI*q.t),1.35),upperReach=q.t>.5?(p.armReach/10)*Math.pow(Math.sin(Math.PI*q.t),.72):0,envelope=Math.max(baseEnvelope,upperReach);rad+=topRimWave(p,a,q.t)*envelope;const crown=bodyCrownFeature(p,a,q.t),theme=themedBodyFeature(p,a,q.t);rad+=crown.radial+theme.radial;y+=crown.lift+theme.lift;rad-=holeDimple(a,p)*Math.pow(Math.sin(Math.PI*q.t),5);rad=Math.max(p.stemDiameter*.48,rad);y+=verticalWave(p,a,q.t)+experimentalLift(p,a,q.t);}else if(q.kind==='hub'){rad=hubRadius(p,a,q.t);}else if(q.kind==='totem'){rad=integratedTotemRadius(p,q.t,a,p.stemDiameter/2);}else if(q.kind==='handle'){rad=handleRadius(p.handleStyle,q.t,p,a);if(p.handleStyle==='twisted'){const ang=a+p.handleTwist*q.t*.18;pos.push(Math.cos(ang)*rad,y,Math.sin(ang)*rad);uv.push(i/seg,j/(rings.length-1));continue;}}pos.push(Math.cos(a)*rad,y,Math.sin(a)*rad);uv.push(i/seg,j/(rings.length-1));}}

  for(let j=0;j<rings.length-1;j++)for(let i=0;i<seg;i++){const n=(i+1)%seg,a=j*seg+i,b=j*seg+n,c=(j+1)*seg+n,d=(j+1)*seg+i;idx.push(a,d,b,b,d,c);}

  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const details=figurativeDetails(p,bodyTop,handleBase);if(!details.length)return balanceExperimental(g,p);/* Three's built-in primitives do not all use the same indexing format. Normalising them prevents intermittent merge failures. */const compatible=[g,...details].map(part=>part.index?part.toNonIndexed():part);const merged=mergeGeometries(compatible,false);if(!merged){console.warn('TopBot could not combine decorative geometry; using the safe core.');return g;}merged.computeVertexNormals();return balanceExperimental(merged,p);

}

function familyLabel(p){return p.theme!=='atlantis'?`${p.theme.toUpperCase()} • ${p.form.toUpperCase()}`:`${p.rimStyle.toUpperCase()} • ${p.topperStyle==='none'?p.handleStyle.toUpperCase()+' HANDLE':labelize(p.topperStyle).toUpperCase()+' HANDLE'}`;}

function familySize(p){return `Ø ${p.bodyDiameter} • PLA`;}

const ENUM_OPTIONS={rimStyle:styles,rimPattern:rimPatterns,bodyCrownStyle:bodyCrowns,bodyTheme:bodyThemes,handleStyle:handles,pommelStyle:pommels,hubStyle:hubs,topperStyle:topperStyles};

const controlsEditor=document.querySelector('#controlsEditor');

const quickComplexity=document.querySelector('#quickComplexity'),quickComplexityValue=document.querySelector('#quickComplexityValue'),quickTopper=document.querySelector('#quickTopper'),topperQuickField=document.querySelector('#topperQuickField');

for(const style of topperStyles.filter(style=>style!=='none')){const option=document.createElement('option');option.value=style;option.textContent=labelize(style);quickTopper.append(option);}
let lastCharacter='dolphinTail';
const characterCheckbox=document.createElement('input');characterCheckbox.type='checkbox';characterCheckbox.id='characterEnabled';characterCheckbox.checked=false;
const characterToggle=document.createElement('label');characterToggle.className='character-toggle';characterToggle.htmlFor='characterEnabled';characterToggle.append(characterCheckbox,document.createTextNode(' Character on'));topperQuickField.prepend(characterToggle);

const CONTROL_GROUPS={

 top:[['Core body',['bodyDiameter','bodyHeight','tipLength']],['Outer rim',['rimStyle','rimPattern','lobes','secondaryLobes','waveDepth','rimLift','rimSweep','armSpiral','armReach','twist','holes','holeSize']],['Body crown',['bodyCrownStyle','bodyCrownSize','bodyCrownHeight','bodyCrownLobes','bodyCrownTwist']],['Inner hub',['hubStyle','hubHeight','hubDepth','hubLobes','hubTwist']],['Handle',['stemHeight','stemDiameter','handleStyle','handleTwist','handleFins','handleFlare','pommelStyle']],['Totem',['topperHeight','topperWidth','topperFeatures','topperTwist','topperRelief']]],



};

function labelize(key){const names={experimentalEnabled:'Enable experimental designs',outlineStyle:'Body outline',outlineAmount:'Outline strength',alienStyle:'Alien shoulder detail',alienAmount:'Detail strength'};if(names[key])return names[key];if(key==='topperStyle')return 'Totem character';if(key==='topperHeight')return 'Totem share of handle';return key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());}

function optionsFor(p,key){if(key==='outlineStyle')return outlineNames;if(key==='alienStyle')return alienNames;return ENUM_OPTIONS[key];}

function ruleFor(p,key){if(['outlineAmount','alienAmount'].includes(key))return [0,100];return rules[key];}

function renderParameterControls(p){controlsEditor.replaceChildren();controlsEditor.dataset.family=p.toyType;const keys=[];for(const [groupName,groupKeys] of CONTROL_GROUPS[p.toyType]){const present=groupKeys.filter(key=>key in p);if(!present.length)continue;const group=document.createElement('details');group.className='studio-section parameter-group';group.setAttribute('name','design-submenu');const title=document.createElement('summary');title.textContent=groupName;group.append(title);controlsEditor.append(group);for(const key of present){keys.push(key);const value=p[key],row=document.createElement('div');row.className='parameter-row';const head=document.createElement('div');head.className='parameter-head';const label=document.createElement('label');label.textContent=labelize(key);const output=document.createElement('output');output.textContent=typeof value==='boolean'?(value?'On':'Off'):key==='topperHeight'?Math.round(Math.min(.72,Math.max(.45,value/42))*100)+'%':String(value);head.append(label,output);let input;if(typeof value==='boolean'){input=document.createElement('input');input.type='checkbox';input.checked=value;}else if(key==='color'){input=document.createElement('input');input.type='color';}else if(typeof value==='number'){input=document.createElement('input');input.type='range';const range=ruleFor(p,key);input.min=range[0];input.max=range[1];input.step='1';}else{input=document.createElement('select');for(const option of optionsFor(p,key)){const item=document.createElement('option');item.value=option;item.textContent=key==='hubStyle'&&p.toyType==='top'?({smooth:'Smooth blend',halo:'Rounded halo',petal:'Petal waves',gear:'Ripple swirl',crystal:'Flowing swirl',crown:'Crown waves'})[option]:labelize(option);input.append(item);}}input.dataset.key=key;input.value=value;if(input.type==='checkbox')input.checked=value;label.htmlFor=`param-${key}`;input.id=`param-${key}`;row.append(head,input);group.append(row);}}controlsEditor.dataset.keys=keys.join('|');}

function syncQuickControls(p){quickComplexity.value=p.complexity;quickComplexityValue.textContent=`${p.complexity}%`;topperQuickField.classList.toggle('hidden',p.toyType!=='top');if(p.toyType==='top'){const enabled=p.topperStyle!=='none';characterCheckbox.checked=enabled;quickTopper.disabled=!enabled;if(enabled){lastCharacter=p.topperStyle;quickTopper.value=p.topperStyle;}else{quickTopper.value=lastCharacter;}}}

function syncParameterControls(p){const expected=CONTROL_GROUPS[p.toyType].flatMap(group=>group[1]).filter(key=>key in p).join('|');if(controlsEditor.dataset.family!==p.toyType||controlsEditor.dataset.keys!==expected){renderParameterControls(p);}else for(const input of controlsEditor.querySelectorAll('[data-key]')){const value=p[input.dataset.key];input.value=value;if(input.type==='checkbox')input.checked=value;input.closest('.parameter-row').querySelector('output').textContent=typeof value==='boolean'?(value?'On':'Off'):input.dataset.key==='topperHeight'?Math.round(Math.min(.72,Math.max(.45,value/42))*100)+'%':String(value);}syncQuickControls(p);}

function setEditorMode(mode){const sliders=mode==='controls';controlsEditor.classList.toggle('hidden',!sliders);editor.classList.toggle('hidden',sliders);document.querySelector('#modeControls').classList.toggle('active',sliders);document.querySelector('#modeJson').classList.toggle('active',!sliders);if(sliders){try{syncParameterControls(validate(JSON.parse(editor.value)));}catch{message.className='message error';message.textContent='Fix the JSON before returning to sliders.';setEditorMode('json');}}}

function geometryIsUsable(geometry){const position=geometry?.getAttribute?.('position');if(!position||position.count<12)return false;for(let i=0;i<position.array.length;i++)if(!Number.isFinite(position.array[i]))return false;geometry.computeBoundingBox();const b=geometry.boundingBox,values=[b?.min.x,b?.min.y,b?.min.z,b?.max.x,b?.max.y,b?.max.z];if(values.some(value=>!Number.isFinite(value)))return false;const size=new THREE.Vector3();b.getSize(size);return size.x>.1&&size.y>.1&&size.z>.1&&size.x<250&&size.y<250&&size.z<250;}

let lastThemeFrame='',lastGeometryKey='';
function geometryRecipeKey(p){const {color,material,rainbowPhase,paint,...shape}=p;return JSON.stringify(shape);}
function frameThemePreview(p,g){
 const size=g.boundingBox.getSize(new THREE.Vector3()),key=p.theme+'/'+p.form+'/'+size.x.toFixed(1)+'/'+size.y.toFixed(1);
 if(key===lastThemeFrame)return;
 if(p.theme!=='atlantis'){
  scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(currentMesh),centre=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length()/2;
  const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight),halfFov=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*aspect));
  const direction=camera.position.clone().sub(controls.target).normalize(),distance=radius/Math.sin(halfFov)*1.12;
  controls.target.copy(centre);camera.position.copy(centre).addScaledVector(direction,distance);controls.maxDistance=Math.max(210,distance*1.6);camera.far=Math.max(500,distance*3);camera.updateProjectionMatrix();controls.update();
 }else if(lastThemeFrame&&!lastThemeFrame.startsWith('atlantis/')){camera.position.set(100,65,120);controls.target.set(0,20,0);controls.update();}
 lastThemeFrame=key;
}
function regenerate(quiet=false, preview=false){try{const p=validate(JSON.parse(editor.value)),effective=effectiveParams(p);editor.value=JSON.stringify(p,null,2);const geometryKey=geometryRecipeKey(effective)+(preview?'|preview':'|final');let geometry=currentMesh&&geometryKey===lastGeometryKey?currentMesh.geometry:buildGeometry(effective, preview),fallbackUsed=false;if(!geometryIsUsable(geometry)){geometry?.dispose?.();const safe={...effective,bodyTheme:'none',topperStyle:'none'};geometry=buildGeometry(safe, preview);fallbackUsed=true;}if(!geometryIsUsable(geometry))throw Error('This combination could not form a valid 3D shape. Your previous design has been kept.');const mat=new THREE.MeshPhysicalMaterial({color:new THREE.Color(p.color),roughness:.31,metalness:.03,clearcoat:.72,clearcoatRoughness:.18}),nextMesh=new THREE.Mesh(geometry,mat);nextMesh.castShadow=true;nextMesh.receiveShadow=true;nextMesh.position.y=-geometry.boundingBox.min.y;if(currentMesh){topGroup.remove(currentMesh);if(currentMesh.geometry!==geometry)currentMesh.geometry.dispose();currentMesh.material.dispose();}lastGeometryKey=fallbackUsed?'':geometryKey;current=p;currentMesh=nextMesh;topGroup.add(currentMesh);topGroup.rotation.set(0,0,0);topGroup.position.set(0,0,0);const leans=true;tiltGroup.rotation.set(leans?0.018:0,0,leans?-0.065:0);tiltGroup.position.set(0,0,0);precessionGroup.rotation.set(0,0,0);precessionGroup.position.set(0,-7.96,0);frameThemePreview(p,geometry);syncParameterControls(p);document.querySelector('#toyType').value=p.toyType;document.querySelector('#shapeChip').textContent=`${familyLabel(p)} • ${Math.round(p.complexity)}%`;document.querySelector('#sizeChip').textContent=familySize(p);message.className=fallbackUsed?'message':'message ok';message.textContent=fallbackUsed?'Generated safely — one incompatible decorative detail was skipped.':quiet?'Ready.':p.complexity===0&&p.theme==='atlantis'?'Generated — pure, round and completely unornamented.':'Generated — sliders and JSON are in sync.';studio?.sync();

if (typeof filamentChoice !== 'undefined' && filamentChoice) {
  updateFilamentPreview();
}

return true;}catch(e){message.className='message error';message.textContent=e instanceof SyntaxError?'That JSON has a formatting error. Check commas and quotes.':e.message;return false;}}

const aiPrompt=document.querySelector('#aiPrompt'),askOtto=document.querySelector('#askOtto'),newAiChat=document.querySelector('#newAiChat'),undoAi=document.querySelector('#undoAi'),aiStatus=document.querySelector('#aiStatus'),changeAccess=document.querySelector('#changeAccess'),accessGate=document.querySelector('#accessGate'),accessForm=document.querySelector('#accessForm'),heyottoKey=document.querySelector('#heyottoKey'),showKey=document.querySelector('#showKey'),manualMode=document.querySelector('#manualMode'),accessError=document.querySelector('#accessError');

let aiMessages=[],aiConversationId='',previousAiRecipe=null,sessionApiKey='',aiEnabled=false;

function setAiStatus(text,type=''){aiStatus.textContent=text;aiStatus.className=`ai-status ${type}`.trim();}

function cleanApiKey(value){return String(value||'').replace(/^Bearer\s+/i,'').replace(/[^\x21-\x7E]/g,'');}

function setAiEnabled(enabled){aiEnabled=enabled;aiPrompt.disabled=!enabled;askOtto.disabled=!enabled;newAiChat.disabled=!enabled;if(enabled){setAiStatus('Connected for this browser tab. Your key will not be saved.','ok');}else{resetAiChat();setAiStatus('Manual mode — sliders, 3D preview and STL download are ready.');}}

function openAccessGate(){accessError.textContent='';heyottoKey.value='';heyottoKey.type='password';showKey.textContent='Show';showKey.setAttribute('aria-pressed','false');accessGate.hidden=false;requestAnimationFrame(()=>heyottoKey.focus());}

function closeAccessGate(){accessGate.hidden=true;}

accessForm.addEventListener('submit',event=>{event.preventDefault();const key=cleanApiKey(heyottoKey.value);if(!/^ak_[A-Za-z0-9._~-]{8,}$/.test(key)){accessError.textContent='That does not look like a HeyOtto API key. It should begin with ak_.';heyottoKey.focus();return;}sessionApiKey=key;heyottoKey.value='';resetAiChat();setAiEnabled(true);closeAccessGate();aiPrompt.focus();});

manualMode.addEventListener('click',()=>{sessionApiKey='';setAiEnabled(false);closeAccessGate();});

showKey.addEventListener('click',()=>{const showing=heyottoKey.type==='text';heyottoKey.type=showing?'password':'text';showKey.textContent=showing?'Show':'Hide';showKey.setAttribute('aria-pressed',String(!showing));heyottoKey.focus();});

changeAccess.addEventListener('click',openAccessGate);

window.addEventListener('pagehide',()=>{sessionApiKey='';});

function parseOttoRecipe(content){if(typeof content!=='string')throw Error('Otto returned an empty response.');let text=content.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');const first=text.indexOf('{'),last=text.lastIndexOf('}');if(first<0||last<first)throw Error('Otto did not return a JSON recipe.');const raw=upgradeRecipe(JSON.parse(text.slice(first,last+1)),DEFAULT);if(!PRESETS[raw.toyType])throw Error('Otto returned an unknown toy type.');const wanted=Object.keys(PRESETS[raw.toyType]).sort(),received=Object.keys(raw).sort();if(wanted.join('|')!==received.filter(k=>!['design','material','rainbowPhase','paint'].includes(k)).join('|'))throw Error('Otto returned missing or unfamiliar recipe fields. Please try again.');return validate(raw);}

function changeSummary(before,after){const changed=Object.keys(after).filter(key=>before[key]!==after[key]);if(!changed.length)return 'Otto kept the current design.';const names=changed.slice(0,4).map(labelize);return `Changed ${names.join(', ')}${changed.length>4?` and ${changed.length-4} more`:''}.`;}

async function askOttoForDesign(){if(!aiEnabled||!sessionApiKey){setAiStatus('Choose Access and enter a HeyOtto key to use AI design.','error');openAccessGate();return;}const request=aiPrompt.value.trim();if(!request){setAiStatus('Describe what you would like Otto to change.','error');aiPrompt.focus();return;}let before;try{before=validate(JSON.parse(editor.value));}catch(error){setAiStatus(`Fix the current recipe first: ${error.message}`,'error');return;}askOtto.disabled=true;aiPrompt.disabled=true;setAiStatus('Otto is imagining your toy…');const nextMessages=[...aiMessages,{role:'user',content:request}];try{const response=await fetch('/api/design',{method:'POST',headers:{'content-type':'application/json','x-heyotto-api-key':sessionApiKey},body:JSON.stringify({messages:nextMessages,current_recipe:{...before,paint:undefined,...(before.design?{design:{...before.design,paint:{strokes:[]}}}:{})},conversation_id:aiConversationId||undefined})});const data=await response.json().catch(()=>({error:'TopBot could not read the API response.'}));if(!response.ok)throw Error(data.error||'Otto could not complete that design.');const recipe=parseOttoRecipe(data.content);if(before.design&&recipe.design)recipe.design.paint=before.design.paint;if(before.paint)recipe.paint=before.paint;previousAiRecipe=before;aiMessages=[...nextMessages,{role:'assistant',content:data.content}];aiConversationId=data.conversation_id||aiConversationId;editor.value=JSON.stringify(recipe,null,2);document.querySelector('#toyType').value=recipe.toyType;regenerate(true);undoAi.classList.remove('hidden');aiPrompt.value='';setAiStatus(changeSummary(before,recipe),'ok');}catch(error){const hint=location.protocol==='file:'?' Open TopBot using start-topbot.ps1, not by double-clicking index.html.':'';setAiStatus(`${error.message}${hint}`,'error');}finally{askOtto.disabled=!aiEnabled;aiPrompt.disabled=!aiEnabled;if(aiEnabled)aiPrompt.focus();}}

function resetAiChat(){aiMessages=[];aiConversationId='';previousAiRecipe=null;undoAi.classList.add('hidden');setAiStatus('Fresh conversation started. Otto will use the design currently on screen.','ok');}

function undoAiChange(){if(!previousAiRecipe)return;const recipe=previousAiRecipe;previousAiRecipe=null;editor.value=JSON.stringify(recipe,null,2);document.querySelector('#toyType').value=recipe.toyType;regenerate(true);undoAi.classList.add('hidden');setAiStatus('The last AI design change was undone.','ok');}

function mutate(){let p;try{p=validate(JSON.parse(editor.value));}catch{p={...PRESETS[document.querySelector('#toyType').value]};}const r=(lo,hi,step=1)=>Number((Math.round((lo+Math.random()*(hi-lo))/step)*step).toFixed(4)),pick=a=>a[Math.floor(Math.random()*a.length)],color=pick(['#8e6df2','#ff784e','#bdf268','#56b7e8','#f5a4ce','#f4cf57','#45d6a7']),characterEnabled=p.topperStyle!=='none';if(characterEnabled)lastCharacter=p.topperStyle;if(p.theme!=='atlantis'){p={...p,form:pick(forms[p.theme]),radialScale:r(.8,1.2,.05),radialDepth:r(1,7),radialCount:r(5,12),profileHeight:r(.8,1.2,.05),structureWall:r(4.5,8,.25),structureGap:r(.75,1.25,.05),structureTwist:r(-.8,.8,.1),structureLayers:r(2,4),structureFilled:p.structureFilled!==false,handleStyle:pick(handles),pommelStyle:pick(pommels),handleTwist:r(0,10),handleFins:r(0,12),handleFlare:r(1,10),topperStyle:characterEnabled?pick(topperStyles.filter(style=>style!=='none')):'none',topperHeight:r(16,32),topperWidth:r(12,24),topperFeatures:r(3,12),topperTwist:r(-10,10),topperRelief:r(0,7),color,material:pick(['white','pastelRainbow','vividRainbow']),rainbowPhase:Math.random()};if(p.topperStyle!=='none')lastCharacter=p.topperStyle;editor.value=JSON.stringify(p,null,2);regenerate();return;}if(p.toyType==='top')p={...p,designSeed:r(0,9999),bodyTheme:pick(bodyThemes),themeAmount:r(0,8),themeSize:r(1,8),rimStyle:pick(styles),rimPattern:pick(rimPatterns),rimSweep:r(-10,10),armSpiral:r(-12,12),armReach:r(3,10),bodyCrownStyle:pick(bodyCrowns),bodyCrownSize:r(1,10),bodyCrownHeight:r(0,8),bodyCrownLobes:r(3,18),bodyCrownTwist:r(-10,10),handleStyle:pick(handles),pommelStyle:pick(pommels),hubStyle:pick(hubs),hubHeight:r(0,9),hubDepth:r(0,7),hubLobes:r(3,16),hubTwist:r(-10,10),lobes:r(4,12),secondaryLobes:r(5,24),waveDepth:r(3,10),rimLift:r(1,8),twist:r(0,10),handleTwist:r(0,10),handleFins:r(0,12),handleFlare:r(1,10),topperStyle:characterEnabled?pick(topperStyles.filter(style=>style!=='none')):'none',topperHeight:r(16,32),topperWidth:r(12,24),topperFeatures:r(3,12),topperTwist:r(-10,10),topperRelief:r(0,7),color,material:pick(['white','pastelRainbow','vividRainbow']),rainbowPhase:Math.random()};if(p.topperStyle!=='none')lastCharacter=p.topperStyle;editor.value=JSON.stringify(p,null,2);regenerate();}

function download(){if(!regenerate(true)||!currentMesh)return;const exporter=new STLExporter(),exportGeometry=current.design?currentMesh.geometry.clone().rotateX(Math.PI/2).translate(0,0,-currentMesh.geometry.boundingBox.min.y):currentMesh.geometry,exportMesh=new THREE.Mesh(exportGeometry);const data=exporter.parse(exportMesh,{binary:true});if(current.design)exportGeometry.dispose();const blob=new Blob([data],{type:'model/stl'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`topbot-${current.toyType}-${Date.now().toString().slice(-5)}.stl`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);message.textContent=current.design?'STL downloaded — millimetres, Z-up, tip on the build plane.':'STL downloaded — units are millimetres; preview lean is not exported.';}

function safeStlFilenamePart(value) {
  return String(value || '')
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function filamentFilenameLabel(filament) {
  if (filament === 'pastel') {
    return 'Glow-in-the-dark-rainbow';
  }

  if (filament === 'vivid') {
    return 'Vivid';
  }

  return 'White';
}

function buildSavedTopExportGeometry(recipe) {
  const validated = validate(
    JSON.parse(JSON.stringify(recipe))
  );

  const effective = effectiveParams(validated);

  let geometry = buildGeometry(effective);

  if (!geometryIsUsable(geometry)) {
    geometry?.dispose?.();

    const safe = {
      ...effective,
      bodyTheme: 'none',
      topperStyle: 'none'
    };

    geometry = buildGeometry(safe);
  }

  if (!geometryIsUsable(geometry)) {
    geometry?.dispose?.();

    throw new Error(
      'This saved design could not form valid STL geometry.'
    );
  }

  /*
   * Match TopBot's normal STL export behaviour.
   *
   * Newer design-based geometry is rotated to Z-up and moved
   * so its lowest point sits exactly on the build plane.
   */
  if (validated.design) {
    geometry.computeBoundingBox();

    const minY = geometry.boundingBox.min.y;

    geometry.rotateX(Math.PI / 2);
    geometry.translate(
      0,
      0,
      -minY
    );
  }

  return geometry;
}

async function downloadSavedTopStl(top, classroom) {
  top = await sharedRequest('adminTop',{topCode:top.topCode});
  if (top.trashed) throw new Error('This top has been moved to Trash.');
  const geometry =
    buildSavedTopExportGeometry(top.recipe);

  try {
    const exporter = new STLExporter();

    const exportMesh =
      new THREE.Mesh(geometry);

    const data = exporter.parse(
      exportMesh,
      { binary: true }
    );

    const blob = new Blob(
      [data],
      { type: 'model/stl' }
    );

    const url =
      URL.createObjectURL(blob);

    const school =
      safeStlFilenamePart(
        classroom?.schoolName || 'School'
      );

    const student =
      safeStlFilenamePart(
        top.studentName || 'Student'
      );

    const code =
      safeStlFilenamePart(
        top.topCode || 'Top'
      );

    const filament =
      filamentFilenameLabel(
        top.filament
      );

    const link =
      document.createElement('a');

    link.href = url;

    link.download =
      `${school}_${student}_${code}_${filament}.stl`;

    document.body.append(link);

    link.click();
    link.remove();

    setTimeout(
      () => URL.revokeObjectURL(url),
      2000
    );
  } finally {
    geometry.dispose();
  }
}

async function downloadSelectedTopStls() {
  if (selectedTopCodes.size === 0) {
    return;
  }

  const database =
    getSavedTopDatabase();

  const tops =
    [...selectedTopCodes]
      .map(code => database[code])
      .filter(top =>
        top &&
        !top.trashed
      );

  if (tops.length === 0) {
    selectedTopCodes.clear();

    if (openAdminClassCode) {
      openClassDetail(
        openAdminClassCode
      );
    }

    return;
  }

  const classroom =
    openAdminClassCode
      ? getClass(openAdminClassCode)
      : null;

  const oldText =
    downloadSelectedTops.textContent;

  downloadSelectedTops.disabled = true;

  let successful = 0;
  let failed = 0;

  try {
    for (const top of tops) {
      try {
        await downloadSavedTopStl(
          top,
          classroom
        );

        successful += 1;

        /*
         * Tiny pause between browser downloads.
         * This makes multiple downloads more reliable.
         */
        await new Promise(resolve =>
          setTimeout(resolve, 250)
        );
      } catch (error) {
        failed += 1;

        console.error(
          `Could not export ${top.topCode}:`,
          error
        );
      }
    }
  } finally {
    if (failed === 0) {
      downloadSelectedTops.textContent =
        `✓ Downloaded ${successful}`;
    } else {
      downloadSelectedTops.textContent =
        `✓ ${successful} downloaded · ${failed} failed`;
    }

    setTimeout(() => {
      downloadSelectedTops.textContent =
        oldText;

      downloadSelectedTops.disabled =
        selectedTopCodes.size === 0;
    }, 2200);
  }
}

document.querySelector('#regenerate').onclick=()=>regenerate();document.querySelector('#mutate').onclick=mutate;

document.querySelector('#reset').onclick = async e => {
  const button = e.currentTarget;
  const oldText = button.textContent;

  try {
    await navigator.clipboard.writeText(editor.value);

    button.textContent = '✓ Copied!';
    message.className = 'message ok';
    message.textContent = 'JSON copied to clipboard.';

    setTimeout(() => {
      button.textContent = oldText;
    }, 1200);
  } catch (error) {
    console.error('Copy failed:', error);

    message.className = 'message error';
    message.textContent = 'Could not copy the JSON.';
  }
};

// ============================================================
// TOPBOT SAVE + SHARE
// Shared school storage. Browser records are deliberately not imported.
// ============================================================

const classCodeInput = document.querySelector('#classCode');
const studentNameInput = document.querySelector('#studentName');
const filamentChoice = document.querySelector('#filamentChoice');
const filamentPreviewToggle =
  document.querySelector('#filamentPreviewToggle');
const saveTopButton = document.querySelector('#saveTop');

const topSaveResult = document.querySelector('#topSaveResult');
const savedTopCode = document.querySelector('#savedTopCode');

const loadTopCodeInput = document.querySelector('#loadTopCode');
const loadTopButton = document.querySelector('#loadTop');
const topSaveMessage = document.querySelector('#topSaveMessage');

let sharedClasses = {};
let sharedTops = {};
let schoolListMode = 'active';
let pendingSubmission = null;

// Filament preview colours.
// These affect only the 3D preview — never the saved design recipe.

let filamentPreview = 'pastel';
let filamentPreviewOffset = Math.random();

const FILAMENT_COLORS = {
  pastel: [
    '#f6a9c8',
    '#f8c59f',
    '#f5e49c',
    '#aee0bd',
    '#9edce5',
    '#b9b4eb',
    '#ddaee0'
  ],

  vivid: [
    '#ff3158',
    '#ff8a24',
    '#ffd52e',
    '#47c95b',
    '#28b9dc',
    '#5966e8',
    '#b53bc4'
  ],

  white: [
    '#f4f2e9'
  ]
};

function updateFilamentPreview() {
  if (!studio) return;

  // PREVIEW OFF
  // Give control straight back to the normal TopBot
  // material + painting system.
  if (!filamentPreviewToggle.checked) {
    studio.applyMaterial();
    return;
  }

  const choice = filamentChoice.value;

  // WHITE PLA
  // White is intended to be painted, so retain all
  // of the child's existing paint strokes.
  if (choice === 'white') {
    studio.previewMaterial(
      'white',
      0,
      true
    );

    return;
  }

  // GLOW IN THE DARK RAINBOW
  // Show the realistic filament preview without paint.
  if (choice === 'pastel') {
    studio.previewMaterial(
      'pastelRainbow',
      filamentPreviewOffset,
      false
    );

    return;
  }

  // VIVID RAINBOW
  // Show the realistic filament preview without paint.
  if (choice === 'vivid') {
    studio.previewMaterial(
      'vividRainbow',
      filamentPreviewOffset,
      false
    );
  }
}

// Characters that are difficult to confuse when written/read aloud.
// No O/0, I/1, etc.
const TOP_CODE_CHARACTERS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

// ============================================================
// CLASS DATABASE
// ============================================================

function getClassDatabase() { return sharedClasses; }

function getAllClasses() {
  return Object.values(getClassDatabase());
}

function getClass(classCode) {
  return getClassDatabase()[classCode] || null;
}

function getClassTops(classCode) {
  return Object.values(getSavedTopDatabase())
        .filter(top =>
      top.classCode === classCode &&
      !top.trashed
    )
    .sort((a, b) =>
      String(a.studentName).localeCompare(
        String(b.studentName)
      )
    );
}

function getTrashedClassTops(classCode) {
  return Object.values(getSavedTopDatabase())
    .filter(top =>
      top.classCode === classCode &&
      top.trashed
    )
    .sort((a, b) =>
      String(a.studentName).localeCompare(
        String(b.studentName)
      )
    );
}

async function createTopBotClass(data) {
  const school = await sharedRequest('createSchool', data);
  sharedClasses[school.classCode] = school;
  return school;
}
function getSavedTopDatabase() { return sharedTops; }
function printRoomMessage(text, error = false) {
  const el = document.querySelector('#printRoomMessage');
  el.textContent = text;
  el.className = error ? 'admin-message error' : 'admin-message';
}
async function refreshSharedData() {
  const [schools,tops] = await Promise.all([allRecords('listSchools'),allRecords('listTops')]);
  if (!hasAdminSession()) return;
  sharedClasses = Object.fromEntries(schools.map(item=>[item.classCode,item]));
  sharedTops = Object.fromEntries(tops.map(item=>[item.topCode,item]));
  for (const code of selectedTopCodes) if (!sharedTops[code] || sharedTops[code].trashed) selectedTopCodes.delete(code);
}
async function refreshPrintRoom() {
  const button = document.querySelector('#refreshPrintRoom');
  if (button.disabled) return;
  button.disabled = true;
  printRoomMessage('Loading shared records…');
  try {
    await refreshSharedData();
    if (!printRoomHome.classList.contains('hidden')) renderClassList();
    else if (!trashView.classList.contains('hidden')) renderTrash();
    else if (openAdminClassCode) openClassDetail(openAdminClassCode);
    printRoomMessage('Up to date.');
  } catch(error) { printRoomMessage(error.message,true); }
  finally { button.disabled=false; }
}
async function setSchoolActive(classCode,active) {
  try {
    const school = await sharedRequest('setSchoolActive',{classCode,active});
    sharedClasses[classCode] = school;
    renderClassList();
    printRoomMessage(active ? 'School restored with its original code.' : 'School archived. Its saved tops are retained.');
  } catch(error) { printRoomMessage(error.message,true); }
}

function cleanClassCode(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 4);
}

function cleanTopCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5);
}

function cleanStudentName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 30);
}

function setTopSaveMessage(text, type = '') {
  topSaveMessage.textContent = text;
  topSaveMessage.className = `top-save-message ${type}`.trim();
}

async function saveCurrentTop() {
  if (saveTopButton.disabled) return;
  const classCode = cleanClassCode(classCodeInput.value);
  const studentName = cleanStudentName(studentNameInput.value);
  const filament = filamentChoice.value;

  classCodeInput.value = classCode;
  studentNameInput.value = studentName;

  if (classCode.length !== 4) {
    setTopSaveMessage(
      'Enter the four-digit class code.',
      'error'
    );

    classCodeInput.focus();
    return;
  }



  if (!studentName) {
    setTopSaveMessage(
      'Enter your name so your teacher knows whose top this is.',
      'error'
    );

    studentNameInput.focus();
    return;
  }

  let recipe;

  try {
    recipe = validate(JSON.parse(editor.value));
  } catch (error) {
    setTopSaveMessage(
      'This top cannot be saved until the design recipe is valid.',
      'error'
    );

    return;
  }

  const payload = {classCode,studentName,filament,recipe};
  const fingerprint = JSON.stringify(payload);
  if (!pendingSubmission || pendingSubmission.fingerprint !== fingerprint) {
    pendingSubmission = {fingerprint,submissionId:crypto.randomUUID()};
  }
  let topCode;
  saveTopButton.disabled = true;
  topSaveResult.classList.add('hidden');
  setTopSaveMessage('Saving your top…');
  try {
    const saved = await sharedRequest('submitTop',{...payload,submissionId:pendingSubmission.submissionId},false);
    topCode = saved.topCode;
    // Retain this id for repeated clicks on the same design; changed input gets a new id.
  } catch(error) {
    setTopSaveMessage(error.message || 'Your top could not be saved. Please try again.','error');
    return;
  } finally { saveTopButton.disabled=false; }


  savedTopCode.textContent = topCode;
  topSaveResult.classList.remove('hidden');

  loadTopCodeInput.value = topCode;

  setTopSaveMessage(
    `${studentName}'s top has been saved to class ${classCode}.`,
    'ok'
  );
}

async function loadSavedTop() {
  if (loadTopButton.disabled) return;
  const topCode = cleanTopCode(loadTopCodeInput.value);

  loadTopCodeInput.value = topCode;

  if (topCode.length !== 5) {
    setTopSaveMessage(
      'Enter a five-character Top Code.',
      'error'
    );

    loadTopCodeInput.focus();
    return;
  }

  let savedDesign;
  loadTopButton.disabled=true;
  try {
    savedDesign = await sharedRequest(hasAdminSession()?'adminTop':'loadTop',{topCode},hasAdminSession());
  } catch(error) {
    setTopSaveMessage(error.message || 'This top could not be loaded.','error');
    return;
  } finally { loadTopButton.disabled=false; }


  try {
    const recipe = validate(savedDesign.recipe);

    editor.value = JSON.stringify(recipe, null, 2);

    document.querySelector('#toyType').value = recipe.toyType;

    regenerate(true);

    classCodeInput.value = savedDesign.classCode || '';
    studentNameInput.value = savedDesign.studentName || studentNameInput.value;

    if (
      ['pastel', 'vivid', 'white'].includes(savedDesign.filament)
    ) {
      filamentChoice.value = savedDesign.filament;
    }

    topSaveResult.classList.add('hidden');

    setTopSaveMessage(
      `Top ${topCode} is open. Changes are not saved automatically.`,
      'ok'
    );
  } catch (error) {
    console.error('Could not load TopBot design:', error);

    setTopSaveMessage(
      `Top Code ${topCode} exists, but its recipe could not be opened.`,
      'error'
    );
  }
}

classCodeInput.addEventListener('input', () => {
  classCodeInput.value = cleanClassCode(classCodeInput.value);
});

loadTopCodeInput.addEventListener('input', () => {
  loadTopCodeInput.value = cleanTopCode(loadTopCodeInput.value);
});

loadTopCodeInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    loadSavedTop();
  }
});

saveTopButton.addEventListener('click', saveCurrentTop);
loadTopButton.addEventListener('click', loadSavedTop);

filamentChoice.addEventListener('change', () => {
  const choice = filamentChoice.value;

  if (choice === 'pastel' || choice === 'vivid') {
    filamentPreviewOffset = Math.random();
  }

  updateFilamentPreview();
});

filamentPreviewToggle.addEventListener('change', () => {
  const choice = filamentChoice.value;

  if (
    filamentPreviewToggle.checked &&
    (choice === 'pastel' || choice === 'vivid')
  ) {
    filamentPreviewOffset = Math.random();
  }

  updateFilamentPreview();
});

// ============================================================
// PRINT ROOM
// ============================================================

const printRoom = document.querySelector('#printRoom');
const openPrintRoomButton =
  document.querySelector('#openPrintRoom');
const closePrintRoomButton =
  document.querySelector('#closePrintRoom');

const printRoomHome =
  document.querySelector('#printRoomHome');
const addClassView =
  document.querySelector('#addClassView');
const classDetailView =
  document.querySelector('#classDetailView');

const trashView =
  document.querySelector('#trashView');

const trashTopList =
  document.querySelector('#trashTopList');

const emptyTrash =
  document.querySelector('#emptyTrash');

const openTrashButton =
  document.querySelector('#openTrash');

const backFromTrashButton =
  document.querySelector('#backFromTrash');

const trashCount =
  document.querySelector('#trashCount');

const selectAllShown =
  document.querySelector('#selectAllShown');

const selectedTopCount =
  document.querySelector('#selectedTopCount');

const downloadSelectedTops =
  document.querySelector('#downloadSelectedTops');

const visibleTopCount =
  document.querySelector('#visibleTopCount');

const classList =
  document.querySelector('#classList');
const noClasses =
  document.querySelector('#noClasses');

const adminClassCount =
  document.querySelector('#adminClassCount');
const adminTopCount =
  document.querySelector('#adminTopCount');
const adminWaitingCount =
  document.querySelector('#adminWaitingCount');
const adminPrintedCount =
  document.querySelector('#adminPrintedCount');

const newSchoolName =
  document.querySelector('#newSchoolName');
const newExpectedStudents =
  document.querySelector('#newExpectedStudents');

const createClassButton =
  document.querySelector('#createClass');
const createClassMessage =
  document.querySelector('#createClassMessage');

let openAdminClassCode = null;
let adminFilamentFilter = 'all';
let adminStatusFilter = 'all';

let selectedTopCodes = new Set();

function cleanAdminText(value, maxLength) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function showPrintRoomView(view) {
  printRoomHome.classList.toggle(
    'hidden',
    view !== 'home'
  );

  addClassView.classList.toggle(
    'hidden',
    view !== 'add'
  );

  classDetailView.classList.toggle(
    'hidden',
    view !== 'class'
  );

  trashView.classList.toggle(
    'hidden',
    view !== 'trash'
  );
}

function updatePrintRoomStats() {
  const classes = getAllClasses();

  const tops = Object.values(
    getSavedTopDatabase()
  ).filter(top => !top.trashed);

  const waiting = tops.filter(
    top => top.printStatus === 'waiting'
  ).length;

  const printed = tops.filter(
    top => top.printStatus === 'printed'
  ).length;

  adminClassCount.textContent = classes.filter(school => school.active).length;
  adminTopCount.textContent = tops.length;
  adminWaitingCount.textContent = waiting;
  adminPrintedCount.textContent = printed;
}

function renderClassList() {
  const classes = getAllClasses()
    .filter(school => schoolListMode === 'archived' ? !school.active : school.active)
    .sort((a, b) => {
      const schoolCompare =
        a.schoolName.localeCompare(b.schoolName);

      if (schoolCompare) return schoolCompare;

      return (a.className || '').localeCompare(
        b.className || ''
      );
    });

  classList.replaceChildren();

  noClasses.classList.toggle(
    'hidden',
    classes.length > 0
  );

  noClasses.querySelector('strong').textContent = schoolListMode === 'archived' ? 'No archived schools' : 'No active schools yet';
  noClasses.querySelector('p').textContent = schoolListMode === 'archived' ? 'Archived schools and their tops will appear here.' : 'Add a school to generate its four-digit code.';
  for (const classroom of classes) {
    const tops = getClassTops(classroom.classCode);

    const waiting = tops.filter(
      top => top.printStatus === 'waiting'
    ).length;

    const card = document.createElement('div');
    card.className = 'class-card';


    const info = document.createElement('div');

    const school = document.createElement('div');
    school.className = 'class-card-school';
    school.textContent = classroom.schoolName;

    const name = document.createElement('div');
    name.className = 'class-card-name';

    name.textContent =
      classroom.expectedStudents
        ? `${tops.length}/${classroom.expectedStudents} submitted`
        : `${tops.length} submitted`;

    info.append(school, name);

    const code = document.createElement('div');
    code.className = 'class-card-code';
    code.textContent = classroom.classCode;

    const count = document.createElement('div');
    count.className = 'class-card-count';
    count.innerHTML =
      `${waiting}<span>WAITING TO PRINT</span>`;

    card.append(info, code, count);

    const actions = document.createElement('div');
    actions.className = 'admin-top-actions';
    const view = document.createElement('button');
    view.type = 'button';
    view.textContent = 'View tops';
    view.addEventListener('click',()=>openClassDetail(classroom.classCode));
    const archive = document.createElement('button');
    archive.type = 'button';
    archive.textContent = classroom.active ? 'Archive school' : 'Restore school';
    archive.addEventListener('click',async()=>{
      archive.disabled=true;
      await setSchoolActive(classroom.classCode,!classroom.active);
      archive.disabled=false;
    });
    actions.append(view,archive);
    info.append(actions);

    classList.append(card);
  }

  updatePrintRoomStats();
}

async function moveTopToTrash(topCode) {
  try {
    sharedTops[topCode] = await sharedRequest('updateTop',{topCode,trashed:true});
    selectedTopCodes.delete(topCode);
    if (openAdminClassCode) openClassDetail(openAdminClassCode);
  } catch(error) { printRoomMessage(error.message,true); }
}
async function restoreTopFromTrash(topCode) {
  try {
    sharedTops[topCode] = await sharedRequest('updateTop',{topCode,trashed:false});
    renderTrash(); updatePrintRoomStats();
  } catch(error) { printRoomMessage(error.message,true); }
}

function renderTrash() {
  if (!openAdminClassCode) return;

  const tops =
    getTrashedClassTops(openAdminClassCode);

  trashTopList.replaceChildren();

  emptyTrash.classList.toggle(
    'hidden',
    tops.length > 0
  );

  trashCount.textContent = tops.length;

  for (const top of tops) {
    const row = document.createElement('div');
    row.className =
      'admin-top-row trash-top-row';

    const name = document.createElement('div');
    name.className = 'admin-top-name';
    name.textContent = top.studentName;

    const code = document.createElement('div');
    code.className = 'admin-top-code';
    code.textContent = top.topCode;

    const filament =
      document.createElement('div');

    filament.className =
      'admin-top-filament';

    filament.textContent =
      top.filament === 'pastel'
        ? 'Glow in the dark rainbow'
        : top.filament === 'vivid'
          ? 'Vivid'
          : 'White';

    const restoreButton =
      document.createElement('button');

    restoreButton.type = 'button';
    restoreButton.className =
      'restore-top-button';

    restoreButton.textContent =
      '↶ Restore';

    restoreButton.addEventListener(
      'click',
      () => {
        restoreTopFromTrash(top.topCode);
      }
    );

    row.append(
      name,
      code,
      filament,
      restoreButton
    );

    trashTopList.append(row);
  }
}

async function updateTopPrintStatus(topCode,status) {
  try {
    sharedTops[topCode] = await sharedRequest('updateTop',{topCode,printStatus:status});
    if (openAdminClassCode) openClassDetail(openAdminClassCode);
  } catch(error) { printRoomMessage(error.message,true); }
}

function updateSelectionDisplay(visibleTops) {
  const visibleCodes =
    visibleTops.map(top => top.topCode);

  const visibleSelected =
    visibleCodes.filter(code =>
      selectedTopCodes.has(code)
    );

  selectedTopCount.textContent =
    `${selectedTopCodes.size} selected`;

  downloadSelectedTops.disabled =
    selectedTopCodes.size === 0;

  downloadSelectedTops.textContent =
    selectedTopCodes.size === 0
      ? '↓ Download selected STLs'
      : `↓ Download ${selectedTopCodes.size} STL${
          selectedTopCodes.size === 1 ? '' : 's'
        }`;

  visibleTopCount.textContent =
    `${visibleTops.length} shown`;

  selectAllShown.checked =
    visibleCodes.length > 0 &&
    visibleSelected.length ===
      visibleCodes.length;

  selectAllShown.indeterminate =
    visibleSelected.length > 0 &&
    visibleSelected.length <
      visibleCodes.length;
}

function openClassDetail(classCode) {
  const classroom = getClass(classCode);

  if (!classroom) return;

  openAdminClassCode = classCode;

  const allTops = getClassTops(classCode);

  document.querySelector('#detailSchool')
    .textContent = classroom.active ? 'TOPBOT SCHOOL' : 'ARCHIVED SCHOOL — SUBMISSIONS CLOSED';

  document.querySelector('#detailClassName')
    .textContent = classroom.schoolName;

  document.querySelector('#detailClassCode')
    .textContent = classroom.classCode;

  document.querySelector('#detailSubmissionCount')
    .textContent = classroom.expectedStudents
      ? `${allTops.length}/${classroom.expectedStudents}`
      : allTops.length;

  const list =
    document.querySelector('#classTopList');

  const empty =
    document.querySelector('#noClassTops');

  list.replaceChildren();

  empty.classList.toggle(
    'hidden',
    allTops.length > 0
  );

  const visibleTops = allTops.filter(top => {
    const filamentMatches =
      adminFilamentFilter === 'all' ||
      top.filament === adminFilamentFilter;

    const status =
      top.printStatus || 'waiting';

    const statusMatches =
      adminStatusFilter === 'all' ||
      status === adminStatusFilter;

    return filamentMatches && statusMatches;
  });

  const trashedTops =
    getTrashedClassTops(classCode);

  trashCount.textContent =
    trashedTops.length;

  updateSelectionDisplay(
    visibleTops
  );

  if (
    allTops.length > 0 &&
    visibleTops.length === 0
  ) {
    const filterMessage =
      document.createElement('div');

    filterMessage.className = 'print-filter-empty';
    filterMessage.textContent =
      'No tops match these filters.';

    list.append(filterMessage);
  }

  for (const top of visibleTops) {
    const row = document.createElement('div');

    row.className =
      'admin-top-row has-selection';

    const selectCell =
      document.createElement('label');

    selectCell.className =
      'admin-top-select';

    const checkbox =
      document.createElement('input');

    checkbox.type = 'checkbox';

    checkbox.checked =
      selectedTopCodes.has(top.topCode);

    checkbox.setAttribute(
      'aria-label',
      `Select ${top.studentName}'s top`
    );

    checkbox.addEventListener(
      'change',
      () => {
        if (checkbox.checked) {
          selectedTopCodes.add(top.topCode);
        } else {
          selectedTopCodes.delete(top.topCode);
        }

        updateSelectionDisplay(
          visibleTops
        );
      }
    );

    selectCell.append(checkbox);

    const name = document.createElement('div');
    name.className = 'admin-top-name';
    name.textContent = top.studentName;

    const code = document.createElement('div');
    code.className = 'admin-top-code';
    code.textContent = top.topCode;

    const filament = document.createElement('div');
    filament.className = 'admin-top-filament';

    filament.textContent =
      top.filament === 'pastel'
        ? 'Glow in the dark rainbow'
        : top.filament === 'vivid'
          ? 'Vivid'
          : 'White';

    const currentStatus =
      top.printStatus || 'waiting';

    const status = document.createElement('div');

    status.className =
      `admin-top-status ${currentStatus}`;

    status.textContent = currentStatus;

    const actions =
      document.createElement('div');

    actions.className = 'admin-top-actions';

    const openButton =
      document.createElement('button');

    openButton.type = 'button';
    openButton.className = 'open-top-button';
    openButton.textContent = 'Open';

    openButton.addEventListener('click', () => {
      loadTopCodeInput.value = top.topCode;

      closePrintRoom();
      loadSavedTop();

      const savePanel =
        document.querySelector('#topSavePanel');

      if (savePanel) {
        savePanel.open = true;
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    const statusButton =
      document.createElement('button');

    statusButton.type = 'button';
    statusButton.className =
      'status-top-button';

    if (currentStatus === 'printed') {
      statusButton.textContent = '↶ Waiting';

      statusButton.addEventListener(
        'click',
        () => {
          updateTopPrintStatus(
            top.topCode,
            'waiting'
          );
        }
      );
    } else {
      statusButton.textContent = '✓ Printed';

      statusButton.addEventListener(
        'click',
        () => {
          updateTopPrintStatus(
            top.topCode,
            'printed'
          );
        }
      );
    }

    const trashButton =
      document.createElement('button');

    trashButton.type = 'button';
    trashButton.className =
      'trash-top-button';

    trashButton.textContent = '🗑 Trash';

    trashButton.addEventListener(
      'click',
      () => {
        moveTopToTrash(top.topCode);
      }
    );

    actions.append(
      openButton,
      statusButton,
      trashButton
    );

    row.append(
      selectCell,
      name,
      code,
      filament,
      status,
      actions
    );

    list.append(row);
  }

  showPrintRoomView('class');
  updatePrintRoomStats();
}

selectAllShown.addEventListener(
  'change',
  () => {
    if (!openAdminClassCode) return;

    const visibleTops =
      getClassTops(openAdminClassCode)
        .filter(top => {
          const filamentMatches =
            adminFilamentFilter === 'all' ||
            top.filament ===
              adminFilamentFilter;

          const status =
            top.printStatus || 'waiting';

          const statusMatches =
            adminStatusFilter === 'all' ||
            status === adminStatusFilter;

          return (
            filamentMatches &&
            statusMatches
          );
        });

    for (const top of visibleTops) {
      if (selectAllShown.checked) {
        selectedTopCodes.add(
          top.topCode
        );
      } else {
        selectedTopCodes.delete(
          top.topCode
        );
      }
    }

    openClassDetail(
      openAdminClassCode
    );
  }
);

async function openPrintRoom() {
  if (!hasAdminSession()) { showAdminAccess(); return; }
  printRoom.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  showPrintRoomView('home');
  renderClassList();
  await refreshPrintRoom();
}

function closePrintRoom() {
  printRoom.classList.add('hidden');
  document.body.style.overflow = '';
  openAdminClassCode = null;
  adminFilamentFilter = 'all';
  adminStatusFilter = 'all';
}

function openAddClass() {
  newSchoolName.value = '';
  newExpectedStudents.value = '';

  createClassMessage.textContent = '';
  createClassMessage.className = 'admin-message';

  showPrintRoomView('add');

  setTimeout(() => newSchoolName.focus(), 0);
}

async function createClassFromForm() {
  if (createClassButton.disabled) return;
  const schoolName =
    cleanAdminText(newSchoolName.value, 80);

  const expectedRaw =
    Number(newExpectedStudents.value);

  const expectedStudents =
    Number.isInteger(expectedRaw) &&
    expectedRaw > 0
      ? Math.min(expectedRaw, 100)
      : null;

  if (!schoolName) {
    createClassMessage.textContent =
      'Enter the school name.';

    createClassMessage.className =
      'admin-message error';

    newSchoolName.focus();
    return;
  }

  createClassButton.disabled=true;
  try {
    const classroom = await createTopBotClass({schoolName,expectedStudents});
    openClassDetail(classroom.classCode);
  } catch(error) {
    createClassMessage.textContent=error.message;
    createClassMessage.className='admin-message error';
  } finally { createClassButton.disabled=false; }
}


function setActiveAdminFilter(container, button) {
  container
    .querySelectorAll('button')
    .forEach(item =>
      item.classList.remove('active')
    );

  button.classList.add('active');
}

const filamentFilters =
  document.querySelector('#filamentFilters');

const statusFilters =
  document.querySelector('#statusFilters');

filamentFilters.addEventListener(
  'click',
  event => {
    const button =
      event.target.closest(
        'button[data-filament]'
      );

    if (!button) return;

    adminFilamentFilter =
      button.dataset.filament;

    setActiveAdminFilter(
      filamentFilters,
      button
    );

    if (openAdminClassCode) {
      openClassDetail(openAdminClassCode);
    }
  }
);

statusFilters.addEventListener(
  'click',
  event => {
    const button =
      event.target.closest(
        'button[data-status]'
      );

    if (!button) return;

    adminStatusFilter =
      button.dataset.status;

    setActiveAdminFilter(
      statusFilters,
      button
    );

    if (openAdminClassCode) {
      openClassDetail(openAdminClassCode);
    }
  }
);

openTrashButton.addEventListener(
  'click',
  () => {
    renderTrash();
    showPrintRoomView('trash');
  }
);

downloadSelectedTops.addEventListener(
  'click',
  downloadSelectedTopStls
);

backFromTrashButton.addEventListener(
  'click',
  () => {
    openClassDetail(
      openAdminClassCode
    );
  }
);

const adminAccessGate = document.querySelector('#adminAccessGate');
const adminAccessForm = document.querySelector('#adminAccessForm');
const adminAccessCode = document.querySelector('#adminAccessCode');
const adminAccessError = document.querySelector('#adminAccessError');
const adminAccessSubmit = document.querySelector('#adminAccessSubmit');
const cancelAdminAccess = document.querySelector('#cancelAdminAccess');


let adminLoginRequest = null;
let adminPreviousOverflow = '';

function closeAdminAccess() {
  adminLoginRequest?.abort();
  adminLoginRequest = null;
  adminAccessGate.hidden = true;
  adminAccessCode.value = '';
  adminAccessError.textContent = '';
  adminAccessSubmit.disabled = false;
  document.body.style.overflow = adminPreviousOverflow;
  openPrintRoomButton.focus();
}

function showAdminAccess() {
  if (!adminAccessGate.hidden) return;
  adminPreviousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  adminAccessCode.value = '';
  adminAccessError.textContent = '';
  adminAccessGate.hidden = false;
  adminAccessCode.focus();
}
openPrintRoomButton.addEventListener('click', () => {
  if (hasAdminSession()) return openPrintRoom();
  showAdminAccess();
});
window.addEventListener('topbot-admin-expired',()=>{
  sharedClasses={}; sharedTops={}; selectedTopCodes.clear();
  closePrintRoom(); renderClassList();
  showAdminAccess();
  adminAccessError.textContent='Your admin session has expired. Please enter your code again.';
});
document.querySelector('#refreshPrintRoom').addEventListener('click',refreshPrintRoom);
document.querySelector('#lockPrintRoom').addEventListener('click',()=>{
  forgetAdminSession(); sharedClasses={}; sharedTops={}; selectedTopCodes.clear(); closePrintRoom(); renderClassList();
});
document.querySelector('#schoolListMode').addEventListener('change',event=>{
  schoolListMode=event.target.value; renderClassList();
});


cancelAdminAccess.addEventListener('click', closeAdminAccess);
adminAccessGate.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeAdminAccess();
  }
  if (event.key === 'Tab') {
    const controls = [adminAccessCode, adminAccessSubmit, cancelAdminAccess].filter(el => !el.disabled);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
});

adminAccessForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (adminLoginRequest) return;
  const request = new AbortController();
  adminLoginRequest = request;
  adminAccessSubmit.disabled = true;
  adminAccessError.textContent = '';
  try {
    const response = await fetch('/api/topbot-admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: adminAccessCode.value }),
      signal: request.signal
    });
    const data = await response.json();
    if (adminLoginRequest !== request) return;
    if (!response.ok || data.ok !== true) {
      throw new Error(response.status === 401 ? 'Incorrect admin code.' : data.error || 'Admin access could not be verified.');
    }
    rememberAdminSession(data);
    closeAdminAccess();
    openPrintRoom();
    closePrintRoomButton.focus();
  } catch (error) {
    if (adminLoginRequest !== request) return;
    adminAccessError.textContent = error instanceof TypeError || error instanceof SyntaxError
      ? 'Could not reach admin verification. Start TopBot using the local server and try again.'
      : error.message;
    adminAccessCode.focus();
    adminAccessCode.select();
  } finally {
    if (adminLoginRequest === request) {
      adminLoginRequest = null;
      adminAccessSubmit.disabled = false;
    }
  }
});


closePrintRoomButton.addEventListener(
  'click',
  closePrintRoom
);

document.querySelector('#showAddClass')
  .addEventListener('click', openAddClass);

document.querySelector('#cancelAddClass')
  .addEventListener('click', () => {
    showPrintRoomView('home');
    renderClassList();
  });

document.querySelector('#backToClasses')
  .addEventListener('click', () => {
    showPrintRoomView('home');
    renderClassList();
  });

createClassButton.addEventListener(
  'click',
  createClassFromForm
);

printRoom.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closePrintRoom();
  }
});

document.querySelector('#download').onclick = download;

document.querySelector('#spin').onclick = e => {
  isSpinning = !isSpinning;

  e.currentTarget.setAttribute(
    'aria-pressed',
    isSpinning
  );

  e.currentTarget.textContent =
    isSpinning ? '■ Stop' : '▶ Spin';
};

askOtto.onclick = askOttoForDesign;
newAiChat.onclick = resetAiChat;
undoAi.onclick = undoAiChange;

aiPrompt.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    askOttoForDesign();
  }
});

controlsEditor.addEventListener('input', e => {
  const input = e.target.closest('[data-key]');

  if (!input) return;

  try {
    const p = JSON.parse(editor.value);
    const key = input.dataset.key;

    p[key] =
      input.type === 'checkbox'
        ? input.checked
        : input.type === 'range'
          ? Number(input.value)
          : input.value;

    editor.value = JSON.stringify(p, null, 2);

    const out =
      input.closest('.parameter-row')
        .querySelector('output');

    out.textContent =
      key === 'complexity'
        ? `${p[key]}%`
        : String(p[key]);

    regenerate(true);
  } catch {
    message.className = 'message error';
    message.textContent =
      'That control could not be applied.';
  }
});

quickComplexity.addEventListener('input', e => {
  try {
    const p = JSON.parse(editor.value);

    p.complexity = Number(e.target.value);

    editor.value = JSON.stringify(p, null, 2);

    quickComplexityValue.textContent =
      `${p.complexity}%`;

    regenerate(true);
  } catch {
    message.className = 'message error';
    message.textContent =
      'Fix the JSON before changing complexity.';
  }
});

characterCheckbox.addEventListener(
  'change',
  () => {
    try {
      const p = JSON.parse(editor.value);

      if (p.toyType !== 'top') return;

      if (characterCheckbox.checked) {
        p.topperStyle =
          quickTopper.value ||
          lastCharacter;
      } else {
        if (p.topperStyle !== 'none') {
          lastCharacter = p.topperStyle;
        }

        p.topperStyle = 'none';
      }

      editor.value =
        JSON.stringify(p, null, 2);

      regenerate(true);
    } catch {
      message.className = 'message error';
      message.textContent =
        'Fix the JSON before changing the character.';
    }
  }
);

quickTopper.addEventListener(
  'change',
  e => {
    try {
      const p = JSON.parse(editor.value);

      if (
        p.toyType !== 'top' ||
        !characterCheckbox.checked
      ) {
        return;
      }

      lastCharacter = e.target.value;
      p.topperStyle = e.target.value;

      editor.value =
        JSON.stringify(p, null, 2);

      regenerate(true);
    } catch {
      message.className = 'message error';
      message.textContent =
        'Fix the JSON before changing the character.';
    }
  }
);

document.querySelector('#modeControls').onclick =
  () => setEditorMode('controls');

document.querySelector('#modeJson').onclick =
  () => setEditorMode('json');

document.querySelector('#toyType')
  .addEventListener('change', e => {
    editor.value =
      JSON.stringify(
        PRESETS[e.target.value],
        null,
        2
      );

    renderParameterControls(
      PRESETS[e.target.value]
    );

    regenerate();
  });

editor.addEventListener('keydown', e => {
  if (
    (e.ctrlKey || e.metaKey) &&
    e.key === 'Enter'
  ) {
    regenerate();
  }
});

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  if (
    canvas.width !==
      w * renderer.getPixelRatio() ||
    canvas.height !==
      h * renderer.getPixelRatio()
  ) {
    renderer.setSize(w, h, false);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

let last = performance.now();

function animate(now) {
  resize();

  const dt = Math.min(
    .04,
    (now - last) / 1000
  );

  last = now;

  if (isSpinning) {
    precessionGroup.rotation.y +=
      dt * 2.35;
  }

  controls.update();
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

studio = installStudio({
  baseTop: () => ({ ...DEFAULT }),

  baseFamily: family =>
    structuredClone(PRESETS[family]),

  get: () =>
    JSON.parse(editor.value),

  set: p => {
    p = validate(p);

    editor.value =
      JSON.stringify(p, null, 2);

    regenerate(true);
  },

  preview: p => {
    p = validate(p);

    editor.value =
      JSON.stringify(p, null, 2);

    regenerate(true, true);
  },

  write: p => {
    editor.value =
      JSON.stringify(p, null, 2);

    current = p;
  },

  error: text => {
    message.className = 'message error';
    message.textContent = text;
  },

  mesh: () => currentMesh,
  canvas,
  controls,
  camera,
  renderer,
  scene,

  stopSpin: () => {
    isSpinning = false;

    document.querySelector('#spin')
      .setAttribute(
        'aria-pressed',
        'false'
      );

    document.querySelector('#spin')
      .textContent = '▶ Spin';
  }
});

function randomiseStartupTop() {
  const themes = [
    'atlantis',
    'galactic',
    'terra'
  ];

  const theme =
    themes[
      Math.floor(
        Math.random() * themes.length
      )
    ];

  const p = structuredClone(DEFAULT);

  p.theme = theme;
  p.experimentalEnabled = false;

  // Character always begins switched OFF.
  p.topperStyle = 'none';

  if (theme !== 'atlantis') {
    p.form =
      forms[theme][
        Math.floor(
          Math.random() *
          forms[theme].length
        )
      ];

    // New Galactic/Terra designs begin filled.
    p.structureFilled = true;
  }

  editor.value =
    JSON.stringify(p, null, 2);

  // Perform a full mutation so every fresh launch
  // actually begins with a different design.
  mutate();
}

randomiseStartupTop();
studio.sync();
