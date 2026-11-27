import React,{useEffect,useRef,useState} from 'react';
import {Code2,LoaderCircle} from 'lucide-react';
import {api,post} from './api-client.mjs';
import {withBase} from './base-path.mjs';
import {resolveMedia} from './media-client.mjs';
import {rasterThumbnail} from './thumbnail.mjs';
import {addDiagnostic,diagnostic,installRuntimeObservers,isRuntimeMessage,safeDiagnosticMessage} from './runtime-diagnostics.mjs';
import {RuntimeDiagnostics} from './runtime-diagnostics.jsx';
import './runtime-diagnostics.css';

function token(){const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
class PreviewBoundary extends React.Component{
 constructor(props){super(props);this.state={error:null};}
 static getDerivedStateFromError(error){return {error:diagnostic({error,context:'host'})};}
 render(){return this.state.error?<div className="preview-error"><strong>The preview interface could not open.</strong><p>Your editor and saved work are separate.</p><button className="button" onClick={()=>this.setState({error:null})}>Try preview again</button><RuntimeDiagnostics records={[this.state.error]} capabilities={{}} phase="failed" onRestart={()=>this.setState({error:null})}/></div>:this.props.children;}
}
export function Preview(props){return <PreviewBoundary><IsolatedPreview {...props}/></PreviewBoundary>;}

export function IsolatedPreview({source,css,kind,title='Your website preview',miniature=false,onError,onNavigate,refreshKey=0,projectId,captureRef}){
 const [frameKey,setFrameKey]=useState(null),[fatal,setFatal]=useState(null),[phase,setPhase]=useState('preparing'),[records,setRecords]=useState([]),[capabilities,setCapabilities]=useState({}),[saveStatus,setSaveStatus]=useState(''),[retry,setRetry]=useState(0);
 const iframe=useRef(),channel=useRef(''),payload=useRef(),capturePending=useRef(null),ready=useRef(false),latest=useRef();latest.current={onError,onNavigate,projectId,source,css,kind};
 const record=item=>setRecords(previous=>addDiagnostic(previous,item));
 const fail=item=>{record(item);setFatal(item);setPhase('failed');latest.current.onError?.(item.message);};
 useEffect(()=>installRuntimeObservers(window,record,'host'),[]);
 useEffect(()=>{
  let stopped=false;setPhase('preparing');setFatal(null);latest.current.onError?.('');
  const timeout=setTimeout(async()=>{
   const warn=message=>{if(!stopped)record(diagnostic({context:'resource',message}));};
   try{
    const media=await resolveMedia(source+'\n'+css,{tolerant:true,onWarning:warn});
    let linkMap={};try{linkMap=(await api('/link-map')).links;}catch{warn('Class link updates could not load. Existing links can still be opened.');}
    let compiler;try{compiler=await import('./compiler.mjs');}catch{if(!stopped)fail({...diagnostic({context:'resource',message:'The code compiler could not load. Check the network or school filter, then restart the preview.'}),fatal:true,severity:'fatal'});return;}
    let compiled;try{compiled=kind==='html'?compiler.compileHtml(source):compiler.compile(source);}catch(error){if(!stopped)fail(diagnostic({context:'compile',error}));return;}
    if(stopped)return;setSaveStatus('');channel.current=token();ready.current=false;payload.current={studio:channel.current,type:'render',compiled,source,css,kind,media,linkMap};setFatal(null);setPhase('starting');setFrameKey(channel.current);
   }catch(error){if(!stopped)fail(diagnostic({context:'bootstrap',error}));}
  },miniature?20:650);
  return()=>{stopped=true;clearTimeout(timeout);};
 },[source,css,kind,refreshKey,projectId,retry]);
 useEffect(()=>{
  if(!frameKey)return;const timer=setTimeout(()=>{if(!ready.current)fail({...diagnostic({context:'resource',message:'The preview did not start. Its bundled files may be blocked or the page may be taking too long. Try restarting the preview.'}),fatal:true,severity:'fatal'});},15000);
  return()=>clearTimeout(timer);
 },[frameKey]);
 useEffect(()=>{
  const receive=event=>{
   if(!isRuntimeMessage(event,iframe.current?.contentWindow,channel.current))return;
   const data=event.data;
   if(data.type==='booted'){event.source.postMessage(payload.current,'*');return;}
   if(data.type==='ready'){
    ready.current=true;const values={};for(const key of ['pointerLock','fullscreen','downloads','touch','webglAPI','localStorage','camera','microphone'])if(typeof data.capabilities?.[key]==='boolean')values[key]=data.capabilities[key];setCapabilities(values);
    if(payload.current?.source===latest.current.source&&payload.current?.css===latest.current.css&&payload.current?.kind===latest.current.kind){setFatal(null);setPhase('running');latest.current.onError?.('');}return;
   }
   if(data.type==='diagnostic'){const item=safeDiagnosticMessage(data.diagnostic);if(item)record(item);return;}
   if(data.type==='error'){if(typeof data.message==='string')record(diagnostic({message:data.message,context:'global-error'}));return;}
   if(data.type==='runtime-fatal'){
    if(!['bootstrap','react-render'].includes(data.phase)||typeof data.message!=='string'||data.message.length>500)return;
    fail(diagnostic({context:data.phase,message:data.message}));return;
   }
   if(data.type==='thumbnail'){
    const done=capturePending.current,snapshot=payload.current;capturePending.current=null;
    if(done)rasterThumbnail(data.svg).then(image=>done({image,source:snapshot?.source,css:snapshot?.css,kind:snapshot?.kind}));return;
   }
   if(data.type==='navigate'){if(typeof data.href==='string'&&data.href.length<500)latest.current.onNavigate?.(data.href);return;}
   if(data.type==='game-save'){
    if(typeof data.id!=='string'||data.id.length>80||!['load','save'].includes(data.action))return;
    const target=event.source,token=channel.current,id=data.id;
    const respond=extra=>target.postMessage({studio:token,type:'game-save-result',id,...extra},'*');
    if(miniature||!latest.current.projectId){respond({error:'Open the actual website to save your progress.'});return;}
    if(data.action==='save'&&(!data.data||typeof data.data!=='object'||Array.isArray(data.data)||!Number.isSafeInteger(data.revision))){respond({error:'Invalid game progress.'});return;}
    if(data.action==='save'&&JSON.stringify(data.data).length>131072){respond({error:'Game progress is too large.'});return;}
    setSaveStatus(data.action==='save'?'Saving progress…':'Loading progress…');
    const endpoint='/projects/'+latest.current.projectId+'/game-save',task=data.action==='load'?api(endpoint):post(endpoint,{data:data.data,revision:data.revision});
    task.then(value=>{if(channel.current===token)setSaveStatus(data.action==='save'?'Progress saved online':value.data===null?'No saved progress yet':'Online progress loaded');respond({value});}).catch(error=>{if(channel.current===token){setSaveStatus('Progress could not be saved or loaded. Open Diagnostics.');record(diagnostic({context:'resource',message:error.message}));}respond({error:error.message});});return;
   }
   if(data.type==='leaderboard'&&!miniature&&latest.current.projectId){
    if(typeof data.id!=='string'||data.id.length>80||!['list','submit'].includes(data.action))return;
    if(data.action==='submit'&&(typeof data.name!=='string'||data.name.length>30||!Number.isSafeInteger(data.score)||data.score<0||data.score>1000000000))return;
    const target=event.source,token=channel.current,id=data.id;
    const task=data.action==='list'?api('/leaderboards/'+latest.current.projectId+(data.order==='asc'?'?order=asc':'')).then(d=>d.scores):post('/leaderboards/'+latest.current.projectId,{name:data.name,score:data.score});
    task.then(value=>target.postMessage({studio:token,type:'leaderboard-result',id,value},'*')).catch(error=>{record(diagnostic({context:'resource',message:'An online leaderboard request failed. The game can continue; try again later.'}));target.postMessage({studio:token,type:'leaderboard-result',id,error:error.message},'*');});
   }
  };
  window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
 },[]);
 useEffect(()=>{
  if(!captureRef)return;
  captureRef.current=()=>new Promise(resolve=>{
   if(!iframe.current?.contentWindow||fatal||!ready.current){resolve(null);return;}
   capturePending.current?.(null);const finish=value=>{clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>{capturePending.current=null;resolve(null);},5000);capturePending.current=finish;iframe.current.contentWindow.postMessage({studio:channel.current,type:'capture-thumbnail'},'*');
  });
  return()=>{captureRef.current=null;capturePending.current?.(null);capturePending.current=null;};
 },[captureRef,frameKey,fatal]);
 const restart=()=>setRetry(value=>value+1);
 return <div className={`preview-surface runtime-preview ${miniature?'miniature':''}`}>
  <div className="runtime-stage">{frameKey?<iframe key={frameKey} ref={iframe} title={title} sandbox={miniature?'allow-scripts':'allow-scripts allow-pointer-lock allow-downloads'} allow="fullscreen *" allowFullScreen src={withBase('/sandbox')+'#'+frameKey} loading={miniature?'lazy':'eager'} referrerPolicy="no-referrer"/>:fatal?<div className="preview-error"><Code2 size={24}/><strong>{fatal.category==='compile'?'There is a compilation error':'The preview could not start'}</strong><p>{fatal.message}</p><button className="button" onClick={restart}>Try preview again</button></div>:<div className="preview-wait"><LoaderCircle className="spin" size={22}/><span>Building the preview…</span></div>}</div>
  {fatal&&frameKey&&<div className="runtime-failure" role="alert"><strong>{fatal.category==='compile'?'The latest code could not compile.':'This preview needs attention.'}</strong><p>{fatal.message}</p><button type="button" className="button" onClick={restart}>Restart preview</button></div>}
  {!miniature&&saveStatus&&<div className="runtime-save-status" role="status">{saveStatus}</div>}
  {!miniature&&<RuntimeDiagnostics records={records} capabilities={capabilities} phase={phase} onRestart={restart}/>}
 </div>;
}
