const sculptures=Object.fromEntries(['chalice','alienPod','orbital','anemone','lantern','crown','hourglass','shrine'].map(k=>[k,{}]));

// TopBot 2 vocabulary. Units are millimetres; y is the printing/spindle axis.

export const TAU=Math.PI*2;

export const shapes={

 round:['Abstract','radial',0], flower:['Nature','radial',6], starfish:['Animals','radial',5], octopus:['Animals','radial',8], gear:['Objects','radial',12], sun:['Space','radial',16], snowflake:['Nature','radial',6], amoeba:['Abstract','radial',3], spiral:['Abstract','radial',4], shell:['Nature','radial',9],

 manta:['Animals','outline',[[0,-.95],[.22,-.42],[1,-.15],[.68,.35],[.27,.42],[.12,.62],[0,1],[-.12,.62],[-.27,.42],[-.68,.35],[-1,-.15],[-.22,-.42]]],

 whaleTail:['Animals','outline',[[0,-.8],[.2,-.2],[.95,.25],[1,.7],[.55,.58],[0,.26],[-.55,.58],[-1,.7],[-.95,.25],[-.2,-.2]]],

 fish:['Animals','outline',[[1,0],[.45,.48],[-.25,.4],[-.8,.75],[-.62,0],[-.8,-.75],[-.25,-.4],[.45,-.48]]],

 shark:['Animals','outline',[[1,0],[.3,.27],[-.2,.8],[-.22,.24],[-.65,.16],[-1,.6],[-.8,0],[-1,-.5],[-.6,-.17],[-.1,-.23],[.15,-.6],[.3,-.25]]],

 butterfly:['Animals','outline',[[0,-.3],[.5,-.95],[.95,-.7],[.8,-.1],[.48,.15],[.85,.55],[.58,.9],[.18,.58],[0,.85],[-.18,.58],[-.58,.9],[-.85,.55],[-.48,.15],[-.8,-.1],[-.95,-.7],[-.5,-.95]]],

 bat:['Animals','outline',[[0,-.55],[.2,-.25],[.9,-.65],[1,.2],[.65,.02],[.5,.45],[.3,.25],[0,.65],[-.3,.25],[-.5,.45],[-.65,.02],[-1,.2],[-.9,-.65],[-.2,-.25]]],

 leaf:['Nature','outline',[[0,-1],[.6,-.65],[.78,-.1],[.55,.6],[0,.95],[-.35,.55],[-.55,0],[-.35,-.65]]],

 maple:['Nature','outline',[[0,-1],[.24,-.45],[.6,-.7],[.53,-.12],[1,-.15],[.65,.3],[.8,.58],[.2,.55],[0,.95],[-.2,.55],[-.8,.58],[-.65,.3],[-1,-.15],[-.53,-.12],[-.6,-.7],[-.24,-.45]]],

 ginkgo:['Nature','outline',[[0,-.35],[.4,-.8],[.85,-.5],[1,.2],[.65,.7],[.12,.55],[0,.2],[-.12,.55],[-.65,.7],[-1,.2],[-.85,-.5],[-.4,-.8]]],

 strawberry:['Food','outline',[[0,-.8],[.5,-.9],[.85,-.55],[.8,.15],[.45,.65],[0,1],[-.45,.65],[-.8,.15],[-.85,-.55],[-.5,-.9]]],

 heart:['Fantasy','outline',[[0,-.4],[.45,-.85],[.85,-.6],[.95,-.1],[.6,.5],[0,1],[-.6,.5],[-.95,-.1],[-.85,-.6],[-.45,-.85]]],

 shield:['Fantasy','outline',[[-.75,-.8],[.75,-.8],[.7,.35],[0,1],[-.7,.35]]],

 rocket:['Space','outline',[[0,-1],[.35,-.5],[.35,.3],[.8,.9],[.25,.7],[0,.95],[-.25,.7],[-.8,.9],[-.35,.3],[-.35,-.5]]],

 comet:['Space','outline',[[1,-.8],[.6,.1],[.15,.7],[-.5,.75],[-.9,.25],[-.8,-.35],[-.25,-.65],[.4,-.35]]],

 crystal:['Fantasy','outline',[[0,-1],[.65,-.45],[.8,.4],[0,1],[-.8,.4],[-.65,-.45]]]

};

export const handleShapes=['straight','lighthouse','mushroom','strawberry','rocket','castle','crown','crystal','pawn','ghost','cactus'];

export const palette={white:['#f5f2e9'],pastelRainbow:['#efaaa9','#f3c59e','#eee3a4','#b8d8b4','#aed8e3','#cbb5de','#e7b0cc'],vividRainbow:['#e24e9e','#9246bd','#4568ce','#40bfd0','#69bd79','#ecc079']};

export function defaultDesign(){return {version:2,body:{shape:'manta',width:58,height:12,asymmetry:0,twist:0,stretch:1},edge:{style:'smooth',amount:0,repetition:8},handle:{shape:'lighthouse',height:21,width:9,twist:0},tip:{style:'rounded'},surface:{texture:'none',relief:'emboss',depth:.6},attachments:[],material:'pastelRainbow',rainbowPhase:0,paint:{strokes:[]},safety:{minimumThickness:2.4,maximumOverhang:45,balanceCorrection:true}};}

export function validateDesign(raw){

 const allowed=(obj,keys)=>{if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('Expected a design object.');for(const key of Object.keys(obj))if(!keys.includes(key))throw Error(`Unknown design field: ${key}`);};

 allowed(raw,['hybrid','sculpture','version','body','edge','handle','tip','surface','attachments','material','rainbowPhase','paint','safety']);for(const [key,fields] of Object.entries({body:['shape','width','height','asymmetry','twist','stretch'],edge:['style','amount','repetition'],handle:['shape','height','width','twist'],tip:['style'],surface:['texture','relief','depth'],paint:['strokes'],safety:['minimumThickness','maximumOverhang','balanceCorrection']}))allowed(raw[key],fields);

 const d=structuredClone(raw),num=(o,k,lo,hi)=>{if(!Number.isFinite(o?.[k])||o[k]<lo||o[k]>hi)throw Error(`${k} must be between ${lo} and ${hi}.`);},one=(v,vs)=>{if(!vs.includes(v))throw Error(`Unknown design option: ${v}`);};

 if(d.sculpture){allowed(d.sculpture,['family','height','width','arms','twist','flare','wall']);one(d.sculpture.family,Object.keys(sculptures));num(d.sculpture,'height',38,60);num(d.sculpture,'width',42,64);num(d.sculpture,'arms',3,8);num(d.sculpture,'twist',-1.3,1.3);num(d.sculpture,'flare',.3,1);num(d.sculpture,'wall',2.8,4.5);if(!Number.isInteger(d.sculpture.arms))throw Error('Arm count must be a whole number.');}


 if(d.sculpture&&!d.hybrid){const s=d.sculpture;d.hybrid={style:({chalice:'sunkenChalice',alienPod:'alienShell',orbital:'orbitalRim',anemone:'coiledTentacles',lantern:'alienShell',crown:'petalCrown',hourglass:'sunkenChalice',shrine:'invertedShrine'})[s.family],amount:1.4,repetition:s.arms,twist:Math.max(-1,Math.min(1,s.twist)),printMode:'single'};d.body.shape='round';d.body.width=Math.max(44,s.width);d.handle.height=18;d.paint.strokes=[];delete d.sculpture;}
 if(d.hybrid){if(d.sculpture)throw Error('Choose hybrid or sculpture construction, not both.');allowed(d.hybrid,['style','amount','repetition','twist','printMode']);one(d.hybrid.style,['invertedShrine','coiledTentacles','alienShell','sunkenChalice','orbitalRim','petalCrown']);num(d.hybrid,'amount',.5,2);num(d.hybrid,'repetition',3,12);num(d.hybrid,'twist',-1,1);if(!Number.isInteger(d.hybrid.repetition))throw Error('Repeat must be a whole number.');one(d.hybrid.printMode,['split','single']);d.hybrid.printMode='single';one(d.body.shape,['round','flower','starfish','octopus','gear','sun','snowflake','amoeba','spiral','shell']);num(d.body,'width',44,64);num(d.handle,'height',14,22);}
 if(d.version!==2)throw Error('Expected TopBot design version 2.');

 one(d.body?.shape,Object.keys(shapes));num(d.body,'width',30,65);num(d.body,'height',8,24);num(d.body,'asymmetry',-0.3,.3);num(d.body,'twist',-1,1);num(d.body,'stretch',.7,1.3);

 one(d.handle?.shape,handleShapes);num(d.handle,'height',12,30);num(d.handle,'width',7,12);num(d.handle,'twist',-3,3);

 one(d.edge?.style,['smooth','waves','scallops','gear']);num(d.edge,'amount',0,2);num(d.edge,'repetition',3,16);if(!Number.isInteger(d.edge.repetition))throw Error('Edge repetition must be a whole number.');

 one(d.tip?.style,['rounded','blunt']);one(d.surface?.texture,['none','seeds','scales','waves','spiral','spots']);one(d.surface?.relief,['emboss','engrave']);num(d.surface,'depth',0,1.2);

 one(d.material,Object.keys(palette));num(d,'rainbowPhase',0,1);num(d.safety,'minimumThickness',2.4,4);num(d.safety,'maximumOverhang',30,60);if(typeof d.safety.balanceCorrection!=='boolean')throw Error('Balance correction must be true or false.');

 if(!Array.isArray(d.attachments)||d.attachments.length>6)throw Error('Use up to six attachments.');

 for(const a of d.attachments){allowed(a,['shape','position','scale','rotation','repeat']);allowed(a.position,['x','z']);one(a.shape,[...Object.keys(shapes),'tentacle']);num(a,'scale',3,10);num(a,'rotation',-180,180);num(a,'repeat',1,6);num(a.position,'x',-.65,.65);num(a.position,'z',-.65,.65);if(!Number.isInteger(a.repeat))throw Error('Repeat must be a whole number.');}

 if(!d.paint||!Array.isArray(d.paint.strokes)||d.paint.strokes.length>1500)throw Error('Invalid paint data (maximum 1500 strokes).');

 for(const s of d.paint.strokes){allowed(s,['p','size','color']);if(!Array.isArray(s.p)||s.p.length!==3||s.p.some(v=>!Number.isFinite(v)||Math.abs(v)>150)||!/^#[a-f\d]{6}$/i.test(s.color))throw Error('Invalid paint stroke.');num(s,'size',.5,12);}

 return d;

}

export function radius(shape,a){const [,family,v]=shapes[shape];if(family==='radial'){

 if(shape==='round')return 1;if(shape==='gear')return .83+.17*Math.pow(.5+.5*Math.cos(a*v),.25);

 if(shape==='amoeba')return .75+.14*Math.sin(a*3)+.1*Math.cos(a*5+.8);

 if(shape==='spiral')return .76+.22*Math.cos(a*4+.8*Math.sin(a));

 if(shape==='shell')return (.8+.15*Math.cos(a))*(.92+.08*Math.cos(a*v));

 const power=shape==='octopus'?5:shape==='snowflake'?8:2;return .48+.52*Math.pow(.5+.5*Math.cos(a*v),power);

 }const dx=Math.cos(a),dz=Math.sin(a);let best=Infinity;for(let i=0;i<v.length;i++){const p=v[i],q=v[(i+1)%v.length],ex=q[0]-p[0],ez=q[1]-p[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;const t=(p[0]*ez-p[1]*ex)/den,u=(p[0]*dz-p[1]*dx)/den;if(t>0&&u>=0&&u<=1)best=Math.min(best,t);}return Number.isFinite(best)?Math.max(.23,best):.5;}

export function handleRadius(shape,t,a){const band=(c,w)=>Math.exp(-(((t-c)/w)**2));switch(shape){case 'lighthouse':return .85-.35*t+.35*band(.68,.035)+.55*band(.79,.09)+.6*band(.93,.035);case 'mushroom':return .65+1.05*band(.8,.14);case 'strawberry':return .65+.7*band(.65,.22)+.08*Math.cos(a*7)*band(.65,.2);case 'rocket':return .7+.45*band(.3,.2)*Math.pow(Math.max(0,Math.cos(a*3)),4)+.25*band(.65,.23);case 'castle':return .85+.18*Math.cos(a*4)**8+.5*band(.9,.08);case 'crown':return .7+.65*t*t+.18*Math.cos(a*5)*band(.86,.1);case 'crystal':return (.85+.35*Math.sin(t*Math.PI))*(.85+.15*Math.abs(Math.cos(a*3)));case 'pawn':return .6+.4*band(.1,.08)+.55*band(.8,.15);case 'ghost':return .65+.6*band(.65,.3)+.12*Math.cos(a*5)*band(.3,.1);case 'cactus':return .85+.18*Math.cos(a*7)+.25*band(.55,.2);default:return .85;}}
