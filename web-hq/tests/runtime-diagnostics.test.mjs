import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {resolveMedia} from '../src/media-client.mjs';
import {createGameSaves} from '../src/game-saves.mjs';
import {diagnostic,addDiagnostic,safeDiagnosticMessage,isRuntimeMessage,isParentMessage,diagnosticReport,installRuntimeObservers,redactMessage} from '../src/runtime-diagnostics.mjs';

class Target {
 constructor(){this.listeners=new Map();}
 addEventListener(type,fn){const set=this.listeners.get(type)||new Set();set.add(fn);this.listeners.set(type,set);}
 removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
 emit(type,values={}){for(const fn of this.listeners.get(type)||[])fn({target:this,...values});}
}
test('extension provenance and unknown errors never imply a fatal application failure',()=>{
 for(const scheme of ['chrome-extension','moz-extension','safari-web-extension','ms-browser-extension']){
  const error={name:'Error',message:'Failed to connect to a wallet',stack:`Error\n at ${scheme}://example/inpage.js:4:2`};
  const item=diagnostic({error});assert.equal(item.category,'external-extension');assert.equal(item.fatal,false);
 }
 assert.equal(diagnostic({message:'Failed to connect to MetaMask'}).category,'unknown');
 assert.equal(diagnostic({message:'Failed to connect to MetaMask'}).fatal,false);
 assert.equal(diagnostic({error:{message:'Broken click',stack:'at web-hq-student.jsx:34:2'}}).category,'runtime');
 for(const context of ['compile','react-render','bootstrap'])assert.equal(diagnostic({context,error:new Error('Broken code')}).fatal,true);
 assert.equal(diagnostic({context:'react-render',error:{stack:'chrome-extension://example/file.js'}}).fatal,true);
});
test('global observers retain errors without cancelling browser handling or signalling fatal failure',()=>{
 const target=new Target();target.document=new Target();const records=[];
 const original=()=>{};target.onerror=original;
 const stop=installRuntimeObservers(target,item=>records.push(item));
 const forbidden=()=>assert.fail('must not cancel the browser error');
 target.emit('error',{message:'Extension failed',filename:'chrome-extension://example/file.js',preventDefault:forbidden,stopPropagation:forbidden});
 target.emit('unhandledrejection',{reason:{message:'Extension rejected',stack:'moz-extension://example/file.js'},preventDefault:forbidden});
 target.emit('unhandledrejection',{reason:'Unknown rejected task',preventDefault:forbidden});
 target.emit('error',{message:'Student event failed',filename:'web-hq-student-inline.js',lineno:12});
 target.emit('error',{target:{tagName:'IMG'}});
 target.document.emit('pointerlockerror');target.document.emit('webglcontextlost');
 assert.deepEqual(records.slice(0,5).map(r=>r.category),['external-extension','external-extension','unknown','runtime','resource']);
 assert.ok(records.every(r=>!r.fatal));assert.equal(target.onerror,original);
 stop();target.emit('error',{message:'After cleanup'});assert.equal(records.length,7);
});
test('runtime messages require the expected frame, opaque origin and private channel',()=>{
 const frame={},parent={},token='private-channel';const event={source:frame,origin:'null',data:{studio:token,type:'diagnostic'}};
 assert.ok(isRuntimeMessage(event,frame,token));
 for(const patch of [{source:{}},{origin:'https://unrelated.example'},{data:{studio:'wrong',type:'runtime-fatal'}}])assert.ok(!isRuntimeMessage({...event,...patch},frame,token));
 assert.ok(isParentMessage({source:parent,origin:'https://school.example',data:{studio:token}},parent,'https://school.example',token));
 assert.ok(!isParentMessage({source:parent,origin:'null',data:{studio:token}},parent,'https://school.example',token));
 const forged=safeDiagnosticMessage({category:'render',context:'react-render',message:'Pretend fatal',fatal:true});assert.equal(forged.fatal,false);
 assert.equal(safeDiagnosticMessage({category:'unknown',context:'global-error',message:'x'.repeat(501)}),null);
});
test('copyable reports omit messages, stacks, URLs, credentials, source code and account data',()=>{
 const sensitive='password=pretend-password token=pretend-token https://example.test/private user@example.test';
 const item=diagnostic({message:sensitive,error:{name:'TypeError',stack:sensitive}});
 const records=addDiagnostic(addDiagnostic([],item),item);assert.equal(records[0].count,2);
 const report=diagnosticReport(records,{camera:false,privateKey:sensitive},'running');
 for(const value of ['pretend-password','pretend-token','example.test','privateKey','"stack"'])assert.ok(!report.includes(value));
 assert.ok(!redactMessage(sensitive).includes('pretend-password'));
 let bounded=[];for(let i=0;i<100;i++)bounded=addDiagnostic(bounded,diagnostic({message:'Error '+i}));assert.equal(bounded.length,40);
});

async function sandboxHarness(){
 const window=new Target(),document=new Target(),messages=[],parent={postMessage:(data,origin)=>messages.push({data,origin})};
 document.documentElement={};document.head={appendChild(){}};document.body={innerHTML:''};document.querySelectorAll=()=>[];document.createElement=()=>({});
 window.document=document;window.StudioRuntime={React:{Component:class{}},ReactDOM:{}};
 const context={window,document,parent,location:{href:'https://school.example/web-hq/sandbox#test-channel',hash:'#test-channel'},URL,Blob,crypto:webcrypto,navigator:{maxTouchPoints:0},Map,Uint8Array,setTimeout,clearTimeout,console,diagnostic,installRuntimeObservers,isParentMessage,redactMessage,
 MutationObserver:class{observe(){}},DOMParser:class{parseFromString(source){return {querySelectorAll:()=>[],head:{querySelectorAll:()=>[]},body:{innerHTML:source}}}}};
 const source=await fs.readFile(new URL('../src/sandbox.mjs',import.meta.url),'utf8');
 context.createGameSaves=createGameSaves;
 vm.runInNewContext(source.replace(/^import .*;\r?\n/gm,''),context,{timeout:1000});
 const render=(overrides={})=>window.emit('message',{source:parent,origin:'https://school.example',data:{studio:'test-channel',type:'render',kind:'html',source:'<main>Working game</main>',css:'',compiled:[],...overrides}});
 return {window,document,messages,parent,render};
}
test('actual sandbox keeps a mounted HTML application after global errors and rejected promises',async()=>{
 const h=await sandboxHarness();h.render();assert.equal(h.document.body.innerHTML,'<main>Working game</main>');
 assert.ok(h.messages.some(m=>m.data.type==='ready'));
 h.window.emit('error',{message:'Wallet failed',filename:'chrome-extension://example/inpage.js'});
 h.window.emit('unhandledrejection',{reason:{message:'Extension task failed',stack:'moz-extension://example/inpage.js'}});
 h.window.emit('unhandledrejection',{reason:'Unknown rejected task'});
 h.window.emit('error',{message:'Application click error',filename:'web-hq-student-event.js'});
 assert.equal(h.document.body.innerHTML,'<main>Working game</main>');
 assert.equal(h.messages.filter(m=>m.data.type==='runtime-fatal').length,0);
 assert.deepEqual(h.messages.filter(m=>m.data.type==='diagnostic').map(m=>m.data.diagnostic.category),['external-extension','external-extension','unknown','runtime']);
 assert.ok(h.messages.every(m=>m.origin==='https://school.example'));
});
test('actual sandbox ignores forged parents and reports caught bootstrap failures separately',async()=>{
 const h=await sandboxHarness();
 h.window.emit('message',{source:{},origin:'https://school.example',data:{studio:'test-channel',type:'render'}});
 h.window.emit('message',{source:h.parent,origin:'https://attacker.example',data:{studio:'test-channel',type:'render'}});
 assert.equal(h.document.body.innerHTML,'');
 h.render({compiled:[{module:true,code:'throw new Error("Deliberate bootstrap failure")'}]});
 const fatal=h.messages.find(m=>m.data.type==='runtime-fatal');assert.equal(fatal.data.phase,'bootstrap');
 assert.equal(h.messages.filter(m=>m.data.type==='ready').length,0);
});
test('HTML imports of ReactDOM receive the same render boundary as JSX pages',async()=>{
 const h=await sandboxHarness();let rendered;
 h.document.getElementById=()=>({});
 h.window.StudioRuntime.React={Component:class{},createElement:(type,props,...children)=>({type,props:{...props,children}})};
 h.window.StudioRuntime.ReactDOM={createRoot:()=>({render:node=>{rendered=node;}})};
 h.render({compiled:[{module:true,code:'require("react-dom/client").createRoot(document.getElementById("root")).render("game")'}]});
 assert.equal(typeof rendered.type,'function');
 const boundary=new rendered.type(rendered.props);boundary.componentDidCatch(new Error('HTML React render failed'));
 assert.equal(h.messages.find(m=>m.data.type==='runtime-fatal').data.phase,'react-render');
});
test('blocked uploaded media has a tolerant preview fallback while strict callers still fail',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('Network blocked');};
 const source='studio-media:00000000-0000-0000-0000-000000000000';
 try{await assert.rejects(resolveMedia(source),/Network blocked/);const warnings=[];const result=await resolveMedia(source,{tolerant:true,onWarning:m=>warnings.push(m)});assert.match(result[source],/^data:image\/png;base64,/);assert.equal(warnings.length,1);}finally{globalThis.fetch=original;}
});
