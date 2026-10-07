import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
// --- BOWLING SOUNDS ---

const pinSounds = [
    new Audio('./sounds/pin1.wav'),
    new Audio('./sounds/pin2.wav'),
    new Audio('./sounds/pin3.wav'),
    new Audio('./sounds/pin4.wav')
];

function playPinSound(){

    // Don't make noise during accelerated training
    if(isTraining) return;

    const original =
        pinSounds[Math.floor(Math.random()*pinSounds.length)];

    // Clone it so several pin sounds can overlap
    const sound=original.cloneNode();

    sound.volume=.55;
    sound.play().catch(()=>{});
}

const actionSounds = {
            doorOpen: new Audio('./sounds/door_open.mp3'),
            doorClose: new Audio('./sounds/door_close.mp3'),
            sit: new Audio('./sounds/sit.mp3'),
            eat: new Audio('./sounds/eat.mp3'),
            drink: new Audio('./sounds/drink.mp3'),
            arcade: new Audio('./sounds/arcade.mp3')
        };

        function playActionSound(name) {
            // Keep accelerated training silent.
            if (isTraining) return;

            const original = actionSounds[name];
            if (!original) return;

            const sound = original.cloneNode();
            sound.volume = 0.5;
            sound.play().catch(() => {});
        }

// Retro arcade carpet, drawn locally: no image downloads or extra assets.
// Change these colours or CARPET_TILE_PIXELS to customise the background.
const CARPET_TILE_PIXELS=620;
function makeCarpetBackground(){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=768;
    const ctx=canvas.getContext('2d');
    // Separate seeded generator leaves the simulation's random exploration alone.
    let seed=71329;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const colours=['#d9bd25','#e88b76','#dc6d82','#35ac81','#7d739a','#dc813c'];
    ctx.fillStyle='#211d29';ctx.fillRect(0,0,768,768);
    // Scatter motifs with a little breathing room, without a grid.
const motifs=[];
const tileSize=768;

for(let attempt=0;attempt<2500 && motifs.length<42;attempt++){
    const x=random()*tileSize;
    const y=random()*tileSize;

    const tooClose=motifs.some(m=>{
        // Measure across tile edges too.
        const dx=Math.abs(x-m.x);
        const dy=Math.abs(y-m.y);

        return Math.hypot(
            Math.min(dx,tileSize-dx),
            Math.min(dy,tileSize-dy)
        )<76;
    });

    if(tooClose)continue;

    motifs.push({
        x,y,
        angle:random()*Math.PI*2,
        scale:.65+random()*.8,
        shape:Math.floor(random()*7),
        colour:colours[Math.floor(random()*colours.length)],
        dots:Array.from({length:24},()=>({
            x:-21+random()*40,
            y:-21+random()*40
        }))
    });
}

function drawMotif(m,x,y){
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(m.angle);
    ctx.scale(m.scale,m.scale);

    ctx.fillStyle=m.colour;
    ctx.strokeStyle=m.colour;
    ctx.lineWidth=4;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.shadowColor='#0b0910';
    ctx.shadowOffsetX=4;
    ctx.shadowOffsetY=5;
    ctx.beginPath();

    if(m.shape===0){
        // Dotted ribbon.
        ctx.fillRect(-13,-39,26,78);
        ctx.shadowColor='transparent';
        ctx.fillStyle='#f4dcbb';

        for(let y=-33;y<36;y+=10){
            for(let x=-8;x<=8;x+=8){
                ctx.beginPath();
                ctx.arc(x,y,2.4,0,Math.PI*2);
                ctx.fill();
            }
        }
    }else if(m.shape===1){
        ctx.arc(0,0,29,0,Math.PI*2);
        ctx.fill();
    }else if(m.shape===2){
        // Curved squiggle.
        ctx.moveTo(-32,-35);
        ctx.bezierCurveTo(45,-44,-50,-8,23,-12);
        ctx.bezierCurveTo(58,-10,-47,24,12,24);
        ctx.bezierCurveTo(37,25,-4,39,-15,40);
        ctx.stroke();
    }else if(m.shape===3){
        // Two-colour triangle.
        ctx.moveTo(-29,-29);
        ctx.lineTo(33,-12);
        ctx.lineTo(-8,34);
        ctx.closePath();
        ctx.fill();

        ctx.shadowColor='transparent';
        ctx.fillStyle='#76628b';
        ctx.beginPath();
        ctx.moveTo(-29,-29);
        ctx.lineTo(3,1);
        ctx.lineTo(-8,34);
        ctx.closePath();
        ctx.fill();
    }else if(m.shape===4){
        // Zigzag.
        ctx.moveTo(-30,-30);
        ctx.lineTo(-8,-16);
        ctx.lineTo(-26,0);
        ctx.lineTo(0,12);
        ctx.lineTo(-12,28);
        ctx.lineTo(18,40);
        ctx.stroke();
    }else if(m.shape===5){
        ctx.arc(0,0,23,0,Math.PI*2);
        ctx.stroke();
    }else{
        // Confetti square.
        ctx.fillRect(-25,-25,50,50);
        ctx.shadowColor='transparent';
        ctx.fillStyle='#f4dcbb';
        ctx.globalAlpha=.45;

        for(const dot of m.dots){
            ctx.fillRect(dot.x,dot.y,2,5);
        }
    }

    ctx.restore();
}

// Copies across the edges make the pattern seamless.
for(const motif of motifs){
    for(const offsetX of [-tileSize,0,tileSize]){
        for(const offsetY of [-tileSize,0,tileSize]){
            drawMotif(
                motif,
                motif.x+offsetX,
                motif.y+offsetY
            );
        }
    }
}

// Scatter small dashes independently of the larger shapes.
for(let i=0;i<45;i++){
    const x=random()*tileSize;
    const y=random()*tileSize;
    const angle=random()*Math.PI*2;
    const length=8+random()*18;

    ctx.strokeStyle=colours[Math.floor(random()*colours.length)];
    ctx.lineWidth=2;
    ctx.lineCap='round';

    for(const offsetX of [-tileSize,0,tileSize]){
        for(const offsetY of [-tileSize,0,tileSize]){
            ctx.beginPath();
            ctx.moveTo(x+offsetX,y+offsetY);
            ctx.lineTo(
                x+offsetX+Math.cos(angle)*length,
                y+offsetY+Math.sin(angle)*length
            );
            ctx.stroke();
        }
    }
}
    // Fine fibres give the pattern a subtle carpet texture.
    ctx.shadowColor='transparent';
    for(let i=0;i<24000;i++){
        ctx.fillStyle=i%2?'rgba(255,255,255,.045)':'rgba(0,0,0,.09)';
        ctx.fillRect(random()*768,random()*768,1,1+random()*2);
    }
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    return texture;
}
const scene = new THREE.Scene();

// Change this hex value for the solid background.
scene.background = new THREE.Color(0x000000);

const carpetTexture = makeCarpetBackground();
carpetTexture.repeat.set(3, 1.5);



const camera=new THREE.PerspectiveCamera(48,1,.1,500);camera.position.set(0,13,23);camera.lookAt(0,0,2);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));$('#world').prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x60745d,2.5));let dl=new THREE.DirectionalLight(0xffffff,1.7);dl.position.set(4,10,5);scene.add(dl);
const M=c=>new THREE.MeshStandardMaterial({color:c,roughness:.76});
function box(x,y,z,w,h,d,c){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.position.set(x,y,z);scene.add(m);return m}
box(0,-.3,-2,8,.45,17,0xd9aa68);box(-4.15,.35,-2,.3,1.35,17,0x824200);box(4.15,.35,-2,.3,1.35,17,0x824200);
for(let i=-3;i<=3;i++)box(i*1.05,-.06,-2,.035,.02,16,0xb77f49);
const ball=new THREE.Mesh(new THREE.SphereGeometry(.58,18,12),M(0x704ca2));scene.add(ball);// Bowling ball finger holes
// Bowling ball finger holes
const holeMat = new THREE.MeshStandardMaterial({
    color: 0x120b18,
    roughness: 1
});

function makeBallHole(x, y, z, size=.075){

    const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(size, size*.72, .10, 16),
        holeMat
    );

    // CylinderGeometry points along Y by default.
    // Aim the cylinder outward from the centre of the ball.
    const outward = new THREE.Vector3(x,y,z).normalize();

    hole.quaternion.setFromUnitVectors(
        new THREE.Vector3(0,1,0),
        outward
    );

    // Put the opening just slightly beneath the ball surface
    hole.position.copy(
        outward.multiplyScalar(.53)
    );

    ball.add(hole);
}

// Two finger holes
makeBallHole(-.12, .50, .26, .070);
makeBallHole( .12, .50, .26, .070);

// Thumb hole — slightly larger, as on a real bowling ball
makeBallHole(0, .39, .40, .07);

// The original ball remains the invisible physics ball.
// This clone is what the player actually sees.
const visualBall=ball.clone(true);

scene.add(visualBall);

// Hide the physics ball itself
ball.visible=false;

// --- BOWLING PINS ---
const pins=[];

function makePin(){

  // Side profile of a bowling pin.
  // x = radius, y = height
  const profile=[
    new THREE.Vector2(0,   0.00), // closes the bottom
    new THREE.Vector2(.20, 0.00), // flat base
    new THREE.Vector2(.27, 0.05),
    new THREE.Vector2(.31, 0.18), // wide lower body
    new THREE.Vector2(.32, 0.34),
    new THREE.Vector2(.29, 0.50),
    new THREE.Vector2(.23, 0.65), // shoulder
    new THREE.Vector2(.15, 0.78), // neck
    new THREE.Vector2(.13, 0.88),
    new THREE.Vector2(.17, 0.98), // head begins
    new THREE.Vector2(.20, 1.08),
    new THREE.Vector2(.18, 1.17),
    new THREE.Vector2(.11, 1.23),
    new THREE.Vector2(0,   1.25)  // top
  ];

  const group=new THREE.Group();

  // White pin body
  const body=new THREE.Mesh(
    new THREE.LatheGeometry(profile,24),
    M(0xfaf9f2)
  );
  group.add(body);

  // Two red neck stripes
  const stripeMat=M(0xe52323);

  const stripe1=new THREE.Mesh(
    new THREE.CylinderGeometry(.151,.151,.055,24),
    stripeMat
  );
  stripe1.position.y=.82;
  group.add(stripe1);

  const stripe2=new THREE.Mesh(
    new THREE.CylinderGeometry(.145,.145,.045,24),
    stripeMat
  );
  stripe2.position.y=.90;
  group.add(stripe2);

  return group;
}

// Standard triangular rack:
//       o
//      o o
//     o o o
//    o o o o
for(let r=0;r<4;r++){
  for(let i=0;i<=r;i++){
    const p=makePin();
    scene.add(p);
    pins.push(p);
  }
}

// OLD FLY
// const fly=new THREE.Group(), body=new THREE.Mesh(new THREE.SphereGeometry(.34,12,8),M(0x302b25));body.scale.z=1.45;fly.add(body);
// let head=new THREE.Mesh(new THREE.SphereGeometry(.26,12,8),M(0x493b2e));head.position.z=-.48;fly.add(head);
// for(let s of [-1,1]){let eye=new THREE.Mesh(new THREE.SphereGeometry(.13,10,7),M(0xd54a55));eye.position.set(.19*s,.07,-.67);fly.add(eye);
// let w=new THREE.Mesh(new THREE.SphereGeometry(.28,10,6),new THREE.MeshStandardMaterial({color:0xd8f8ff,transparent:true,opacity:.58}));w.scale.set(1.45,.12,.7);w.position.set(.4*s,.15,.03);fly.add(w)}
// fly.scale.setScalar(1.25);scene.add(fly);

const fly=new THREE.Group();

const body=new THREE.Mesh(
    new THREE.SphereGeometry(.34,12,8),
    M(0x302b25)
);
body.scale.z=1.45;
fly.add(body);

let head=new THREE.Mesh(
    new THREE.SphereGeometry(.26,12,8),
    M(0x493b2e)
);
head.position.z=-.48;
fly.add(head);

// Keep references to the wings so we can animate them
const wings=[];

for(let s of [-1,1]){

    // Eye
    let eye=new THREE.Mesh(
        new THREE.SphereGeometry(.13,10,7),
        M(0xd54a55)
    );

    eye.position.set(.19*s,.07,-.67);
    fly.add(eye);

    // Wing
    // Wing hinge — this is the point where the wing joins the body
const wingPivot=new THREE.Group();

wingPivot.position.set(.27*s,.15,.03);
wingPivot.userData.side=s;

fly.add(wingPivot);

// Wing itself
let w=new THREE.Mesh(
    new THREE.SphereGeometry(.28,10,6),
    new THREE.MeshStandardMaterial({
        color:0xd8f8ff,
        transparent:true,
        opacity:.58
    })
);

w.scale.set(1.45,.12,.7);

// Offset the wing away from its hinge.
// The hinge now sits at the inner/root end of the wing.
w.position.set(.16*s,0,0);

wingPivot.add(w);

// Store the PIVOT rather than the wing
wings.push(wingPivot);
}

fly.scale.setScalar(1.25);
scene.add(fly);
// Invisible position/rotation used by the AI simulation.
// The visible fly smoothly follows this.
const flyAgent = new THREE.Object3D();
scene.add(flyAgent);
const flyVisualPosition = new THREE.Vector3();
const flyVisualQuaternion = new THREE.Quaternion();


// Fixed lounge: all assets are simple geometry, with floor-level approach points.
const loungeFloor = box(0,-.32,10,17,.45,8,0xe6cfaa);

// Carpet on the top face; keep the sides a plain dark colour.
const floorEdge = M(0x211d29);
const floorTop = new THREE.MeshStandardMaterial({
    map: carpetTexture,
    roughness: 1
});

// Box face order: right, left, top, bottom, front, back.
loungeFloor.material = [
    floorEdge,
    floorEdge,
    floorTop,
    floorEdge,
    floorEdge,
    floorEdge
];

box(-6,-.32,4.7,4,.45,3.4,0x37A64A); // outside the exit
box(-8.35,.35,10,.25,1.3,8,0xBA8256);
box(8.35,.35,10,.25,1.3,8,0xBA8256);
box(0,.35,14,17,1.3,.25,0xBA8256);
function part(group,x,y,z,w,h,d,color){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(color));
    m.position.set(x,y,z);group.add(m);return m;
}
function cylinder(group,x,y,z,rt,rb,h,color){
    const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,20),M(color));
    m.position.set(x,y,z);group.add(m);return m;
}
const sofaSpots=[];
function sofa(x,z,angle){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;scene.add(g);
    part(g,0,.25,0,3,.5,1.4,0x234967);
    part(g,0,1.05,.55,3,1.3,.35,0xf06e82);
    for(const sx of [-.96,0,.96]){
        part(g,sx,.65,-.08,.9,.35,1.1,0x427fa0);
        part(g,sx,1.12,.32,.9,.95,.22,0xf98294);
    }
    for(const sx of [-1.5,1.5])part(g,sx,.7,0,.22,.7,1.5,0xf06e82);
    const local=(lx,lz)=>new THREE.Vector3(lx,.43,lz).applyAxisAngle(new THREE.Vector3(0,1,0),angle).add(new THREE.Vector3(x,0,z));
    sofaSpots.push({approach:local(0,-1.2),seat:local(0,-.1),x,z,angle});
}
sofa(-6.25,10.4,-Math.PI/2); // Right-hand sofa replaced by an arcade.
sofa(-2.6,12.9,0);sofa(2.6,12.9,0);
const table=new THREE.Group();table.position.set(0,0,10.2);scene.add(table);
cylinder(table,0,.55,0,.65,.8,1.1,0x294c68);
cylinder(table,0,1.16,0,1.25,1.25,.18,0x5198b5);
cylinder(table,-.56,1.29,0,.48,.48,.08,0xfffaf0);
const pizza=new THREE.Group();pizza.position.set(-.56,1.36,0);table.add(pizza);
for(let i=0;i<6;i++){
    const slice=new THREE.Mesh(new THREE.CylinderGeometry(.39,.39,.055,12,1,false,i*Math.PI/3,Math.PI/3-.07),M(0xffcb55));
    pizza.add(slice);
    const a=i*Math.PI/3+.4;cylinder(pizza,Math.sin(a)*.23,.04,Math.cos(a)*.23,.055,.055,.018,0xc74736);
}
const drink=new THREE.Group();drink.position.set(.58,1.26,0);table.add(drink);
cylinder(drink,0,.3,0,.19,.14,.6,0xf07b42);
cylinder(drink,0,.61,0,.2,.2,.035,0xfff2d7);
part(drink,.04,.78,0,.04,.34,.04,0xfbe565);
// EDIT THESE TWO CALLS to move, rotate or recolour the cabinets.
// x: left/right; z: along the floor (larger = nearer the camera).
// angle -Math.PI/2 turns the screen towards the left, into the lounge.
const arcades=[
    makeArcade(5.3,7.8,0,0x7446a5,0xf254a6,0xffd953),
    makeArcade(7.3,9.7,-Math.PI/2,0xb50000,0xffa843,0x82e2b0)
];
function makeArcade(x,z,angle,bodyColour,trimColour,controlsColour){
    const group=new THREE.Group();
    group.position.set(x,0,z);group.rotation.y=angle;scene.add(group);
    part(group,0,1.1,0,1.5,2.2,1.15,bodyColour);
    part(group,0,2.65,0,1.65,.5,1.2,trimColour);
    part(group,0,1.95,.6,1.3,1.05,.12,0x26343d);
    const screen=part(group,0,1.95,.68,1.06,.78,.04,0x64dfe8);
    screen.material.emissive=new THREE.Color(0x146975);
    part(group,0,1.3,.75,1.5,.18,.65,controlsColour);
    cylinder(group,-.35,1.52,.85,.045,.045,.3,0x26343d);
    const knob=new THREE.Mesh(new THREE.SphereGeometry(.1,12,8),M(trimColour));
    knob.position.set(-.35,1.68,.85);group.add(knob);
    for(let i=0;i<3;i++)cylinder(group,.05+i*.19,1.42,.87,.065,.065,.04,0x40cfa7);
    const approach=new THREE.Vector3(0,.43,1.4)
        .applyAxisAngle(new THREE.Vector3(0,1,0),angle)
        .add(new THREE.Vector3(x,0,z));
    return {group,screen,approach,played:false,activeUntil:0,activeTicks:0};
}
function nearestArcade(){
    // Once one machine has been played, the other remains available this episode.
    const available=arcades.filter(cabinet=>!cabinet.played);
    return (available.length?available:arcades).reduce((a,b)=>
        flatDistance(flyAgent.position,a.approach)<flatDistance(flyAgent.position,b.approach)?a:b);
}
// Door panels slide sideways into the frame. The vestibule remains walkable.
box(-7.55,1.45,6.25,.2,2.9,.28,0xffb834);
box(-4.45,1.45,6.25,.2,2.9,.28,0xffb834);
box(-6,2.9,6.25,3.3,.22,.3,0xffb834);
const doors=[box(-6.72,1.4,6.25,1.42,2.65,.12,0x87dbe9),box(-5.28,1.4,6.25,1.42,2.65,.12,0x87dbe9)];
doors.forEach(p=>{p.material.transparent=true;p.material.opacity=.65;});
const targetKeys=['ball','pins','sofa','arcade','drink','pizza','exit'];
const specialActions={drink:'drink',sit:'sofa',eat:'pizza',arcade:'arcade',exit:'exit'};
let completed={},touched={},effectTicks={},effectUntil={},restTicks=0,restReturn=null,exited=false,doorOpen=false;
const flatDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function nearestSofa(){return sofaSpots.reduce((a,b)=>flatDistance(flyAgent.position,a.approach)<flatDistance(flyAgent.position,b.approach)?a:b);}
function targets(){return {
    ball:ball.position,
    pins:new THREE.Vector3(0,.43,-7.7),
    sofa:nearestSofa().approach,
    arcade:nearestArcade().approach,
    drink:new THREE.Vector3(.58,.43,10.2),
    pizza:new THREE.Vector3(-.56,.43,10.2),
    exit:new THREE.Vector3(-6,.43,6.25)
};}
const reach={ball:.84,pins:1.4,sofa:1,arcade:1.15,drink:1.35,pizza:1.35,exit:1.25};
function blockedFurniture(p){
    if(Math.hypot(p.x,p.z-10.2)<1.08)return true;
    if(arcades.some(cabinet=>{
        const dx=p.x-cabinet.group.position.x,dz=p.z-cabinet.group.position.z;
        const angle=cabinet.group.rotation.y;
        const x=dx*Math.cos(angle)-dz*Math.sin(angle);
        const z=dx*Math.sin(angle)+dz*Math.cos(angle);
        return Math.abs(x)<.95&&z>-.8&&z<1.15;
    }))return true;
    return sofaSpots.some(s=>{
        const dx=p.x-s.x,dz=p.z-s.z;
        const x=dx*Math.cos(s.angle)-dz*Math.sin(s.angle),z=dx*Math.sin(s.angle)+dz*Math.cos(s.angle);
        return Math.abs(x)<1.7&&Math.abs(z)<.86;
    });
}
function walkable(p){
    const lane=Math.abs(p.x)<=3.65&&p.z>=-9.1&&p.z<=6.8;
    const lounge=Math.abs(p.x)<=8&&p.z>=6.65&&p.z<=13.65;
    const doorway=p.x>=-7.3&&p.x<=-4.7&&p.z>=3.4&&p.z<=7;
    return (lane||lounge||doorway)&&!blockedFurniture(p);
}
function resetLounge(){
    completed={};touched={};effectTicks={};effectUntil={};restTicks=0;restReturn=null;exited=false;doorOpen=false;
    drink.scale.setScalar(1);pizza.visible=true;
    arcades.forEach(cabinet=>{
        cabinet.played=false;cabinet.activeUntil=0;cabinet.activeTicks=0;
        cabinet.screen.material.color.setHex(0x64dfe8);
        cabinet.screen.material.emissiveIntensity=.25;
    });
    doors[0].position.x=-6.72;doors[1].position.x=-5.28;
}

function setDoorOpen(nextOpen) {
    // Only make a sound when the doors change state.
    if (nextOpen === doorOpen) return;

    doorOpen = nextOpen;
    playActionSound(nextOpen ? 'doorOpen' : 'doorClose');
}

function tickLounge(){
    arcades.forEach(cabinet=>cabinet.activeTicks=Math.max(0,cabinet.activeTicks-1));
    for(const key of Object.keys(effectTicks))effectTicks[key]=Math.max(0,effectTicks[key]-1);
    if(restTicks>0&&--restTicks===0&&restReturn){flyAgent.position.copy(restReturn);restReturn=null;}
    setDoorOpen(
    flatDistance(
        flyAgent.position,
        new THREE.Vector3(-6, .43, 6.25)
    ) < 2.6
);
}
function rewardEvent(c,key,event,count=1){return (c.r[key+'.'+event]||0)*count;}
function loungeRewards(c,a,before){
    let reward=0;const points=targets();
    for(const key of targetKeys){
        const d=flatDistance(flyAgent.position,points[key]);
        // Signed progress discourages collecting rewards by pacing back and forth.
        reward+=rewardEvent(c,key,'approach',THREE.MathUtils.clamp(before[key]-d,-.23,.23));
        if(d<=reach[key]&&!touched[key]){touched[key]=true;reward+=rewardEvent(c,key,'touch');}
    }
    const action=ACT[a],key=specialActions[action];
    if(key&&!completed[key]&&flatDistance(flyAgent.position,points[key])<=reach[key]){
        // EXIT is a deliberate step through an already open doorway.
        if(key==='exit'&&!doorOpen)return reward;
        if(key==='arcade'){
            const cabinet=nearestArcade();
            cabinet.played=true;cabinet.activeTicks=24;
            if(!isTraining)cabinet.activeUntil=performance.now()+1680;
            completed.arcade=arcades.every(item=>item.played);
        }else completed[key]=true;
        effectTicks[key]=24;
        const interactionSound = {
        sofa: 'sit',
        pizza: 'eat',
        drink: 'drink',
        arcade: 'arcade'
        };

playActionSound(interactionSound[key]);
        if(!isTraining)effectUntil[key]=performance.now()+1680;
        reward+=rewardEvent(c,key,action);
        if(key==='sofa'){
            restReturn=flyAgent.position.clone();restTicks=14;
            flyAgent.position.copy(nearestSofa().seat);flyAgent.position.y=1.12;
        }
        if(key==='exit'){flyAgent.position.set(-6,.43,4.5);exited=true;}
        if(!isTraining)status({drink:'Slurp! The fly has had a drink.',sofa:'A short rest on the sofa.',pizza:'Yum! The fly ate the pizza.',arcade:'The fly is playing the arcade machine.',exit:'The fly left through the doors.'}[key]);
    }
    return reward;
}

const ACT=['walk','left','right','push','stop','drink','sit','eat','arcade','exit'];
const actionLabels=['Walk','Left','Right','Push','Stop','Drink fizzy drink','Sit on sofa','Eat pizza','Play arcade game','Exit'];
const EPISODE_STEPS=180;
let Q=new Map(),
    episodes=0,
    runTimer=null,
    pinCount=0,
    trainingPins=0,
    testingPins=0,
    trainingPinSources={body:0,ball:0},
    testingPinSources={body:0,ball:0},
    isTraining=false,
    isScoredTest=false,
    currentTestReward=0,
    overallReward=0,
    lastAction='—';
    
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const bearing=(from,to,heading)=>wrap(Math.atan2(to.x-from.x,-(to.z-from.z))-heading);
const bucketAng=a=>{
  const degrees=THREE.MathUtils.radToDeg(wrap(a));
  return Math.round(degrees/15);
};
const bucketDist=d=>d<.85?'T':d<2?'N':d<4.2?'M':'F';
function config(){
 const r={};
 $$('[data-r]').forEach(x=>r[x.dataset.r]=Number.isFinite(+x.value)?+x.value:0);
 return {r,eps:+$('#eps').value/100,alpha:+$('#alpha').value/100,gamma:+$('#gamma').value/100};
}
let activeConfig=null;
const settings=()=>activeConfig||config();
function reset(novel=false){
 resetLounge();
 const bx=novel?(Math.random()*3.8-1.9):(Math.random()*2.6-1.3);ball.position.set(bx,.58,-2.1+Math.random()*.6);ball.userData.v=new THREE.Vector3();

    ball.rotation.set(0,0,0);
 // Start the visual ball exactly on the physics ball
    visualBall.position.copy(ball.position);
    visualBall.quaternion.copy(ball.quaternion);

    // Broad random starts help exploration discover every object, without a scripted policy.
    do {
        if(Math.random()<.65)flyAgent.position.set(Math.random()*15-7.5,.43,6.8+Math.random()*6.3);
        else flyAgent.position.set(Math.random()*6.8-3.4,.43,-5+Math.random()*11);
    } while(!walkable(flyAgent.position)||flatDistance(flyAgent.position,ball.position)<1);

    flyAgent.rotation.y=
        Math.random()*Math.PI*2-Math.PI;

    // Snap the visible fly to the same place when a new run begins
    fly.position.copy(flyAgent.position);
    fly.rotation.y=flyAgent.rotation.y;
 pins.forEach((p,k)=>{
    let r=Math.floor((Math.sqrt(8*k+1)-1)/2);
    let first=r*(r+1)/2, i=k-first;

    p.position.set((i-r/2)*.62,-.075,-7.0-r*.62);
    p.rotation.set(0,0,0);

    p.userData.down=false;
    p.userData.knockSource=null;
    p.userData.falling=false;
    p.userData.velocity=new THREE.Vector3();
    p.userData.angularVelocity=new THREE.Vector3();
});
 pinCount=0;lastAction='—';lastActionIndex = -1;
actionHold = 0;hud();
}
function state(){
 const c=settings(),parts=[],points=targets(),db=flatDistance(ball.position,flyAgent.position);
 // Observations are always enabled. Coarse cells locate the fixed room objects.
 const angle=a=>Math.round(wrap(a)/(Math.PI/4));
 parts.push('X'+Math.floor((flyAgent.position.x+8)/1.5),'Z'+Math.floor((flyAgent.position.z+10)/1.5));
 const close=targetKeys.filter(k=>flatDistance(flyAgent.position,points[k])<=reach[k]);
 parts.push('near:'+(close.join(',')||'-'));
 // Touch and special actions have separate availability, because both can now pay.
 parts.push('done:'+(targetKeys.filter(k=>completed[k]).join(',')||'-'));
 parts.push('touched:'+(targetKeys.filter(k=>touched[k]&&c.r[k+'.touch']!==0).join(',')||'-'));
 parts.push('B'+angle(bearing(flyAgent.position,ball.position,flyAgent.rotation.y)));
 parts.push('D'+bucketDist(db));
 parts.push('P'+angle(bearing(flyAgent.position,points.pins,flyAgent.rotation.y)));
 parts.push('H'+angle(flyAgent.rotation.y),'T'+(db<.84?1:0));
 parts.push('standing:'+pins.filter(p=>!p.userData.down).length);
 parts.push('arcades:'+arcades.map(cabinet=>cabinet.played?1:0).join(''));
 return parts.join('|');
}
function vals(s){if(!Q.has(s))Q.set(s,new Float32Array(ACT.length));return Q.get(s)}
function greedy(v,randomTies=true){let mx=Math.max(...v),inds=[];for(let i=0;i<v.length;i++)if(Math.abs(v[i]-mx)<1e-7)inds.push(i);return randomTies?inds[Math.floor(Math.random()*inds.length)]:inds[0]}
let lastActionIndex = -1;
let actionHold = 0;

function pick(s, learning) {
  let v = vals(s), c = settings();

  // Keep doing the current movement briefly.
  // This prevents left-right-left-right shuddering.
  if (actionHold > 0 && lastActionIndex !== -1) {
    actionHold--;
    return lastActionIndex;
  }

  let a;

  if (learning && Math.random() < c.eps) {
    a = Math.floor(Math.random() * ACT.length);
  } else {
    a = greedy(v, true);
  }

  // Don't immediately reverse steering direction
if (
  lastActionIndex !== -1 &&
  ((lastActionIndex === 1 && a === 2) ||
   (lastActionIndex === 2 && a === 1))
) {
  a = 0; // walk forward instead
}

  lastActionIndex = a;

  // Walking/pushing persists slightly longer than turning
  if (a === 0) actionHold = 3;      // walk
  else if (a === 3) actionHold = 2; // push
  else if (a === 1 || a === 2) actionHold = 1; // turn
  else actionHold = 0;

  return a;
}

function distanceToBallPath(pinPos, start, end){

    // Bowling collisions happen across the floor plane,
    // so ignore height (Y).
    const pin2D = new THREE.Vector2(pinPos.x, pinPos.z);
    const start2D = new THREE.Vector2(start.x, start.z);
    const end2D = new THREE.Vector2(end.x, end.z);

    const path = end2D.clone().sub(start2D);
    const lenSq = path.lengthSq();

    if(lenSq === 0){
        return pin2D.distanceTo(start2D);
    }

    let t = pin2D.clone().sub(start2D).dot(path) / lenSq;
    t = THREE.MathUtils.clamp(t,0,1);

    const closest = start2D.clone().add(
        path.multiplyScalar(t)
    );

    return pin2D.distanceTo(closest);
}

function simulate(a){

    const c=settings();
    const wasResting=restTicks>0;
    tickLounge();
    if(exited)return 0;
    const beforePoints=targets(),before={};
    for(const key of targetKeys)before[key]=flatDistance(flyAgent.position,beforePoints[key]);
    const oldFlyPosition=flyAgent.position.clone();
    let rew=wasResting?0:c.r.step;
    // Rest is a brief automatic animation; no extra decision/reward is learned in it.
    if(wasResting)a=4;

    // --------------------------------------------------
    // FLY TURNING
    // --------------------------------------------------

    if(a===1) flyAgent.rotation.y-=.26;
    if(a===2) flyAgent.rotation.y+=.26;


    // --------------------------------------------------
    // FLY MOVEMENT
    // --------------------------------------------------

    if(a===0 || a===3){

        const sp=a===3 ? .20 : .23;

        const oldFlyPos=flyAgent.position.clone();

        flyAgent.position.x+=
            Math.sin(flyAgent.rotation.y)*sp;

        flyAgent.position.z-=
            Math.cos(flyAgent.rotation.y)*sp;


        // Keep WALK from passing through the bowling ball.
        // PUSH is allowed to enter the contact zone.

        const dx=
            flyAgent.position.x-ball.position.x;

        const dz=
            flyAgent.position.z-ball.position.z;

        const distToBall=
            Math.sqrt(dx*dx+dz*dz);

        const minDistance=.76;

        if(distToBall<minDistance && a===0){
            flyAgent.position.copy(oldFlyPos);
        }
    }


    if(!wasResting&&!walkable(flyAgent.position)){
        flyAgent.position.copy(oldFlyPosition);rew+=c.r.wall;
    }
    // Door activation uses the authoritative agent, including during fast training.
    setDoorOpen(
    flatDistance(flyAgent.position, beforePoints.exit) < 2.6
);
    let usefulPushTarget=null;
    const d=flatDistance(ball.position,flyAgent.position);
    if(!wasResting&&d<.84){
        const dir=new THREE.Vector3(Math.sin(flyAgent.rotation.y),0,-Math.cos(flyAgent.rotation.y));
        if(a===3){
            // A useful push aims at a standing pin and actually advances the ball.
            const standing=pins.filter(p=>!p.userData.down);
            const target=standing.reduce((best,p)=>!best||flatDistance(ball.position,p.position)<flatDistance(ball.position,best.position)?p:best,null);
            if(target){
                const toward=target.position.clone().sub(ball.position);toward.y=0;
                if(toward.lengthSq()>0&&dir.dot(toward.normalize())>.3)usefulPushTarget=target.position.clone();
            }
            ball.userData.v.add(dir.multiplyScalar(.29));
            rew+=rewardEvent(c,'ball','push');
        }
        else if(a===0)ball.userData.v.add(dir.multiplyScalar(.025));
    }
    if(!wasResting)rew+=loungeRewards(c,a,before);

    // --------------------------------------------------
    // BALL MOVEMENT
    // --------------------------------------------------

    const oldBallPos=ball.position.clone();

    const ballMove=
        ball.userData.v.clone();

    ball.position.add(ballMove);


    // Roll the physics ball according to distance travelled

    const ballRadius=.58;

    const distance=Math.sqrt(
        ballMove.x*ballMove.x+
        ballMove.z*ballMove.z
    );

    if(distance>0.0001){

        const rollAxis=new THREE.Vector3(
            -ballMove.z,
            0,
            ballMove.x
        ).normalize();

        ball.rotateOnWorldAxis(
            rollAxis,
            distance/ballRadius
        );
    }


    // Ball friction

    ball.userData.v.multiplyScalar(.90);


    // Ball side-wall collision

    if(Math.abs(ball.position.x)>3.55){

        ball.position.x=
            THREE.MathUtils.clamp(
                ball.position.x,
                -3.55,
                3.55
            );

        ball.userData.v.x*=-.25;
    }


    // Keep the bowling ball on the lane; the fly has its own larger room bounds.
    if(ball.position.z < -9.6 || ball.position.z > 6){
        ball.position.z=THREE.MathUtils.clamp(ball.position.z,-9.6,6);ball.userData.v.z*=-.25;
    }

    if(usefulPushTarget&&flatDistance(oldBallPos,usefulPushTarget)-flatDistance(ball.position,usefulPushTarget)>.025){
        rew+=rewardEvent(c,'ball','usefulPush');
    }

    // --------------------------------------------------
    // BALL → PIN COLLISIONS
    // --------------------------------------------------

    for(const p of pins){

        if(
            !p.userData.down &&
            distanceToBallPath(
                p.position,
                oldBallPos,
                ball.position
            ) < .90
        ){

            p.userData.down=true;
            p.userData.falling=true;
            p.userData.knockSource='ball';

            playPinSound();
            
                    

            // Give the pin some of the ball's movement

            p.userData.velocity.x=
                ball.userData.v.x*.45;

            p.userData.velocity.z=
                ball.userData.v.z*.45;


            // Tip in direction of impact

            p.userData.angularVelocity.x=
                ball.userData.v.z*.12;

            p.userData.angularVelocity.z=
                -ball.userData.v.x*.12;


            // Ball loses energy

            ball.userData.v.multiplyScalar(.82);


            // Count the pin

            countKnockedPin(p);


            // Direct ball-hit pin reward

            rew+=rewardEvent(c,'pins','knockBall');
        }
    }


    // --------------------------------------------------
    // UPDATE FALLING PINS
    // --------------------------------------------------

    // The real agent can bowl with its body too. Stationary contact and visual
    // smoothing never count, and a pin can only be knocked down once per episode.
    const bodyMove=flyAgent.position.clone().sub(oldFlyPosition);bodyMove.y=0;
    if(!wasResting&&(a===0||a===3)&&bodyMove.lengthSq()>.0001){
        for(const p of pins){
            if(p.userData.down||distanceToBallPath(p.position,oldFlyPosition,flyAgent.position)>=.68)continue;
            p.userData.down=true;p.userData.falling=true;p.userData.knockSource='body';
            const direction=bodyMove.clone().normalize();
            p.userData.velocity.copy(direction).multiplyScalar(.16);
            p.userData.angularVelocity.set(direction.z*.07,0,-direction.x*.07);
            countKnockedPin(p);
            playPinSound();
            rew+=rewardEvent(c,'pins','knockBody');
        }
    }
    // Chain reactions inherit the cause of the first impact.
    const chainPins=updatePins();
    rew+=rewardEvent(c,'pins','knockBall',chainPins.ball);
    rew+=rewardEvent(c,'pins','knockBody',chainPins.body);

    // --------------------------------------------------
    // TEST REWARD DISPLAY
    // --------------------------------------------------

    if(isScoredTest){
        currentTestReward+=rew;
        overallReward+=rew;
    }


    lastAction=ACT[a];

    return rew;
}


// ======================================================
// PIN → PIN COLLISION
// ======================================================

function countKnockedPin(pin){
    pinCount++;
    // Chain reactions retain the initiating fly/ball source already stored on pins.
    const cause=pin.userData.knockSource==='body'?'body':'ball';
    if(isTraining){trainingPins++;trainingPinSources[cause]++;}
    else if(isScoredTest){testingPins++;testingPinSources[cause]++;}
}

function knockPinFromPin(target,hitter){

    if(target.userData.down){
        return false;
    }


    const hitterSpeed=
        hitter.userData.velocity.length();


    // A pin must actually be moving meaningfully
    // before it can knock another pin down.

    if(hitterSpeed<.025){
        return false;
    }


    target.userData.down=true;
    target.userData.falling=true;
    target.userData.knockSource=hitter.userData.knockSource||'ball';


    // Direction from hitter toward target

    const direction=new THREE.Vector3(
        target.position.x-hitter.position.x,
        0,
        target.position.z-hitter.position.z
    );


    if(direction.lengthSq()<0.0001){

        direction.set(
            Math.random()-.5,
            0,
            Math.random()-.5
        );
    }


    direction.normalize();


    // Transfer some movement

    const force=
        hitterSpeed*.65;


    target.userData.velocity.set(
        direction.x*force,
        0,
        direction.z*force
    );


    // Start target tipping in direction of impact

    target.userData.angularVelocity.set(
        direction.z*.055,
        0,
        -direction.x*.055
    );


    // Hitter loses energy

    hitter.userData.velocity.multiplyScalar(.72);


    // Count newly knocked pin

    countKnockedPin(target);


    // Silent automatically during accelerated training

    playPinSound();


    // Tell updatePins that a new pin fell

    return true;
}


// ======================================================
// FALLING PIN PHYSICS
// ======================================================

function updatePins(){

    const newlyKnocked={ball:0,body:0};


    for(const p of pins){

        if(!p.userData.falling){
            continue;
        }


        // Move sliding pin

        p.position.add(
            p.userData.velocity
        );


        // ----------------------------------------------
        // PIN → PIN COLLISIONS
        // ----------------------------------------------

        for(const other of pins){

            if(
                other===p ||
                other.userData.down
            ){
                continue;
            }


            const dx=
                other.position.x-p.position.x;

            const dz=
                other.position.z-p.position.z;

            const distance=
                Math.sqrt(
                    dx*dx+
                    dz*dz
                );


            // Conservative collision radius.
            // Standing rack spacing is .62.

            if(distance<.48){

                const knocked=
                    knockPinFromPin(
                        other,
                        p
                    );

                if(knocked){
                    newlyKnocked[other.userData.knockSource]++;
                }
            }
        }


        // Lose sliding speed

        p.userData.velocity.multiplyScalar(.94);


        // Tip over

        p.rotation.x+=
            p.userData.angularVelocity.x;

        p.rotation.z+=
            p.userData.angularVelocity.z;


        // Falling accelerates slightly

        p.userData.angularVelocity
            .multiplyScalar(1.025);


        // ----------------------------------------------
        // STOP ONCE LYING DOWN
        // ----------------------------------------------

        const tilt=Math.sqrt(
            p.rotation.x*p.rotation.x+
            p.rotation.z*p.rotation.z
        );


        if(tilt>1.35){

            const scale=
                1.35/tilt;

            p.rotation.x*=scale;
            p.rotation.z*=scale;

            p.userData.angularVelocity.set(
                0,
                0,
                0
            );

            p.userData.velocity
                .multiplyScalar(.7);

            p.userData.falling=false;
        }
    }


    return newlyKnocked;
}

function learnStep(finalStep=false){
    const s=state(),a=pick(s,true);let r=simulate(a);
    // Sitting is a single action with a short duration, so credit returns to SIT.
    let duration=1;
    while(restTicks>0){r+=Math.pow(settings().gamma,duration)*simulate(4);duration++;}
    const v=vals(s),c=settings(),mx=exited||finalStep?0:Math.max(...vals(state()));
    v[a]+=c.alpha*(r+Math.pow(c.gamma,duration)*mx-v[a]);
}
let trainingGeneration=0;
function stopRun(){
    trainingGeneration++;clearInterval(runTimer);isTraining=false;isScoredTest=false;activeConfig=null;
    $('#train').disabled=false;
}

async function train(n){
    stopRun();
    const generation=trainingGeneration;
    activeConfig=config();
    $('#train').disabled=true;

    isTraining = true;
    isScoredTest = false;

    // Show progress bar
    $('#trainingProgress').style.display = 'block';
    $('#trainingProgressBar').style.width = '0%';
    $('#trainingProgressText').textContent = `0 / ${n}`;
    $('#trainingProgressPins').textContent = trainingPins;

    // How many episodes to calculate before letting
    // the browser redraw the screen.
    const batchSize = 5;

    for(let e=0; e<n; e++){

        reset(false);

        for(let t=0; t<EPISODE_STEPS&&!exited; t++){
            learnStep(t===EPISODE_STEPS-1);
        }

        episodes++;

        // Every 25 episodes, update the screen
        if((e+1) % batchSize === 0 || e === n-1){

            const completed = e+1;
            const percent = (completed/n)*100;

            $('#trainingProgressBar').style.width = percent + '%';
            $('#trainingProgressText').textContent =
                `${completed} / ${n}`;

            $('#trainingProgressPins').textContent = trainingPins;

            // Give the browser a chance to redraw
            await new Promise(resolve => setTimeout(resolve,0));
            if(generation!==trainingGeneration)return;
        }
    }

    isTraining = false;activeConfig=null;$('#train').disabled=false;

    reset(false);

    $('#trainingProgressBar').style.width = '100%';
    $('#trainingProgressText').textContent = `${n} / ${n}`;
    $('#trainingProgressPins').textContent = trainingPins;

    status(`Learned from ${n} randomized attempts. Press TEST.`);
    hud();
}

function test(untrained=false,novel=false){
    stopRun();
    activeConfig=config();

    // We are no longer training
    isTraining = false;

    // Normal TEST and NEW ALLEY count toward the testing score.
    // UNTRAINED FLY does not.
    isScoredTest = !untrained;

    currentTestReward = 0;

    reset(novel);
    let t=0;

    runTimer=setInterval(()=>{
        let s=state();

        let a=untrained
            ? Math.floor(Math.random()*ACT.length)
            : pick(s,false);

        simulate(a);
        hud();

        if((++t>=EPISODE_STEPS&&!restTicks)||exited){
            clearInterval(runTimer);

            // This test is finished
            isScoredTest = false;

            status(
                `${untrained?'Untrained':'Test'} finished: ` +
                `${pinCount} pin${pinCount===1?'':'s'} down. `+
                (Object.keys(completed).length?'Interactions: '+Object.keys(completed).join(', ')+'.':'No lounge interactions yet.')
            );
        }
    },70);

    status(
        untrained
            ? 'This fly has NO learned policy — watch the chaos.'
            : novel
                ? 'Generalisation test: altered start + ball position.'
                : 'Testing learned policy from a new randomized start…'
    );
}

function updateQPanel(){
    // Work out what state the fly is currently experiencing
    const s = state();

    // Get the Q-values already stored for this state.
    // Don't create a new Q-table entry just for displaying it.
    const v = Q.get(s) || new Float32Array(ACT.length);

    // Show the state
    $('#qState').textContent = s;

    // Show each action's learned value
    $$('#qRows [data-q]').forEach((cell,i)=>cell.textContent=v[i].toFixed(2));

    // Remove any previous highlighting
    const rows = $$('#qRows > div');

    rows.forEach(row => {
        row.style.background = '';
        row.style.fontWeight = '';
    });

    // Highlight the highest-value action.
    // Only highlight when the state actually exists in the Q-table.
    if(Q.has(s)){
        const best = Math.max(...v);

        v.forEach((value,i) => {
            if(value === best){
                rows[i].style.background = '#ffe35d';
                rows[i].style.fontWeight = 'bold';
            }
        });
    }
    $('#currentReward').textContent =
    currentTestReward.toFixed(2);

    $('#overallReward').textContent =
    overallReward.toFixed(2);
}

function hud(){
    $('#ep').textContent=episodes;
    $('#states').textContent=Q.size;
    $('#trainingFlyPins').textContent=trainingPinSources.body;
    $('#trainingBallPins').textContent=trainingPinSources.ball;
    $('#testingFlyPins').textContent=testingPinSources.body;
    $('#testingBallPins').textContent=testingPinSources.ball;
    $('#trainingProgressPins').textContent=trainingPins;
}

function status(x){$('#status').textContent=x}
$('#train').onclick = () => train(+$('#speed').value);
$('#test').onclick = () => test(false, false);
$('#erase').onclick=()=>{
    stopRun();

    Q.clear();

    episodes=0;
    trainingPins=0;
    testingPins=0;
    trainingPinSources={body:0,ball:0};
    testingPinSources={body:0,ball:0};

    currentTestReward=0;
    overallReward=0;

    reset();

    status('Learning erased. UNTRAINED FLY should now be useless again.');
};
$$('.reward-object').forEach(section=>section.addEventListener('toggle',()=>{
    if(section.open)$$('.reward-object').forEach(other=>{if(other!==section)other.open=false;});
}));
$('#closeScience').onclick=()=>$('#science').classList.remove('open');
function resize(){let e=$('#world'),w=e.clientWidth,h=e.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;const distance=Math.max(1,1.35/camera.aspect);camera.position.set(0,9*distance,2+21*distance);camera.lookAt(0,0,1);camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();reset();
(function animate(){
    requestAnimationFrame(animate);

    updateQPanel();

    const time=performance.now();

    // Smoothly glide the visible fly toward its simulation position
    fly.position.x +=
        (flyAgent.position.x - fly.position.x) * .18;

    fly.position.z +=
        (flyAgent.position.z - fly.position.z) * .18;
    
    // Smoothly turn toward the simulation heading
    let turnDifference = wrap(
    flyAgent.rotation.y - fly.rotation.y
    );

    fly.rotation.y += turnDifference * .18;

    // Gentle body bob
    fly.position.y+=(flyAgent.position.y-fly.position.y)*.22;
    if(!restTicks)fly.position.y+=Math.sin(time/100)*.004;
    const effect=key=>isTraining?effectTicks[key]>0:effectUntil[key]>time;
    drink.scale.setScalar(effect('drink')?.35:1);
    pizza.visible=!effect('pizza');
    arcades.forEach(cabinet=>{
        const active=isTraining?cabinet.activeTicks>0:cabinet.activeUntil>time;
        cabinet.screen.material.color.setHex(active?(Math.floor(time/140)%2?0xffdf55:0xff62b0):0x64dfe8);
        cabinet.screen.material.emissiveIntensity=active?1.5:.25;
    });
    doors[0].position.x+=((-6.72-(doorOpen?1.25:0))-doors[0].position.x)*.2;
    doors[1].position.x+=((-5.28+(doorOpen?1.25:0))-doors[1].position.x)*.2;

    // Smoothly follow the physics ball
    visualBall.position.lerp(
        ball.position,
        .18
    );

    // Smoothly follow its rolling rotation
    visualBall.quaternion.slerp(
        ball.quaternion,
        .18
    );

    // Rapid wing buzz
    for(const wing of wings){
        wing.rotation.z =
            Math.sin(time*.055) * (restTicks?.04:.45) * wing.userData.side;
    }

    renderer.render(scene,camera);
})();
