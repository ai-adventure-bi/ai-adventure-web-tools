// This file executes ONLY in /sandbox, which has both an HTTP sandbox policy
// and an iframe sandbox. It cannot access the studio origin, cookies or APIs.
import {createGameSaves} from './game-saves.mjs';
import {diagnostic,installRuntimeObservers,isParentMessage,redactMessage} from './runtime-diagnostics.mjs';
const channel=location.hash.slice(1),parentOrigin=new URL(location.href).origin;
const tell=(type,data={})=>{if(parent!==window)parent.postMessage({studio:channel,type,...data},parentOrigin);};
const validParent=e=>parent!==window&&isParentMessage(e,parent,parentOrigin,channel);
const report=item=>tell('diagnostic',{diagnostic:item});
installRuntimeObservers(window,report);
const capabilities=()=>({pointerLock:typeof document.documentElement.requestPointerLock==='function',fullscreen:!!(document.fullscreenEnabled||document.webkitFullscreenEnabled),downloads:typeof Blob==='function'&&typeof URL.createObjectURL==='function',touch:'ontouchstart' in window||navigator.maxTouchPoints>0,webglAPI:typeof WebGLRenderingContext!=='undefined',localStorage:false,camera:false,microphone:false});
const ready=()=>tell('ready',{capabilities:capabilities()});
document.addEventListener('click',e=>{const a=e.target.closest?.('a');if(!a)return;if(a.hasAttribute('download')&&/^(blob:|data:)/i.test(a.href))return;e.preventDefault();tell('navigate',{href:a.getAttribute('href')});},true);
document.addEventListener('submit',e=>e.preventDefault(),true);
const pending=new Map();
function bridgeCall(type,action,args={}){return new Promise((resolve,reject)=>{if(pending.size>=8)return reject(new Error('Please wait for your other online requests.'));const id=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''),timer=setTimeout(()=>{pending.delete(id);reject(new Error('Online request timed out. Reload progress before retrying a save.'));},type==='game-save'?25000:15000);pending.set(id,{resolve,reject,timer});tell(type,{id,action,...args});});}
const boardCall=(action,args={})=>bridgeCall('leaderboard',action,args);
window.SiteStudio=Object.freeze({saves:createGameSaves((action,args={})=>bridgeCall('game-save',action,args)),capabilities:Object.freeze(capabilities()),leaderboard:Object.freeze({list:(options={})=>boardCall('list',{order:options?.order==='asc'?'asc':'desc'}),submit:(name,score)=>boardCall('submit',{name,score})})});
window.addEventListener('message',e=>{if(!validParent(e)||!['leaderboard-result','game-save-result'].includes(e.data.type))return;const p=pending.get(e.data.id);if(!p)return;clearTimeout(p.timer);pending.delete(e.data.id);e.data.error?p.reject(new Error(e.data.error)):p.resolve(e.data.value);});
let mounted=false;
let capturing=false;
window.addEventListener('message',async e=>{
 if(!validParent(e)||e.data.type!=='capture-thumbnail'||!mounted||capturing)return;
 capturing=true;
 try{
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const original=[document.body,...document.body.querySelectorAll('*')];if(original.length>1800)throw new Error('Page too large for capture');
  const clone=document.body.cloneNode(true),copies=[clone,...clone.querySelectorAll('*')];
  const properties='display position top right bottom left width height min-width min-height max-width max-height margin padding border border-radius box-shadow box-sizing background background-color color opacity font font-family font-size font-weight font-style line-height letter-spacing text-align text-decoration white-space overflow overflow-x overflow-y flex flex-direction flex-wrap flex-grow flex-shrink justify-content align-items align-self gap grid-template-columns grid-template-rows grid-column grid-row transform transform-origin object-fit object-position z-index'.split(' ');
  for(let i=0;i<original.length;i++){const from=original[i],to=copies[i],computed=getComputedStyle(from);for(const attr of [...to.attributes])if(/^on/i.test(attr.name)||['srcset','href','src','poster'].includes(attr.name))to.removeAttribute(attr.name);to.removeAttribute('style');for(const key of properties)to.style.setProperty(key,computed.getPropertyValue(key));
   if(from.tagName==='CANVAS'){try{const img=document.createElement('img');img.src=from.toDataURL('image/png');img.style.cssText=to.style.cssText;to.replaceWith(img);}catch{to.remove();}}
   if(from.tagName==='IMG'&&/^data:image\/(png|jpeg|gif|webp);base64,/.test(from.src))to.src=from.src;
  }
  clone.querySelectorAll('script,iframe,object,embed,link,meta,base,style').forEach(n=>n.remove());clone.style.margin='0';clone.style.width=innerWidth+'px';clone.style.height=Math.min(innerHeight,600)+'px';clone.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+innerWidth+'" height="'+Math.min(innerHeight,600)+'"><foreignObject width="100%" height="100%">'+new XMLSerializer().serializeToString(clone)+'</foreignObject></svg>';
  tell('thumbnail',{svg:svg.length<=2000000?svg:''});
 }catch(error){console.warn('Thumbnail capture unavailable:',error?.message||'Capture failed');tell('thumbnail',{image:''});}finally{capturing=false;}
});
window.addEventListener('message',e=>{
 if(!validParent(e)||e.data.type!=='render'||mounted)return;
 mounted=true;
 const {compiled,source,css,kind,media={},linkMap={}}=e.data;
 const updateLinks=()=>{for(const a of document.querySelectorAll('a[href]')){const href=a.getAttribute('href');if(linkMap[href]&&linkMap[href]!==href)a.setAttribute('href',linkMap[href]);}};new MutationObserver(updateLinks).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
 const resolveMedia=value=>typeof value==='string'?value.replace(/studio-media:[a-f0-9-]{36}/g,key=>media[key]||key):value;
 try{
  const style=document.createElement('style');style.textContent='html,body,#root{height:100%;min-height:100%;margin:0}body{font-family:system-ui,sans-serif}button,a{touch-action:manipulation}button{cursor:pointer}'+resolveMedia(css);document.head.appendChild(style);
   const {React:OriginalReact,ReactDOM,LegacyDOM,Icons,Three,JSXRuntime}=window.StudioRuntime;
   const React={...OriginalReact,createElement(type,props,...children){if(props){props={...props};for(const key of ['src','poster','srcSet'])if(typeof props[key]==='string')props[key]=resolveMedia(props[key]);if(props.style){props.style={...props.style};for(const key of Object.keys(props.style))props.style[key]=resolveMedia(props.style[key]);}}return OriginalReact.createElement(type,props,...children);}};
   class Boundary extends React.Component{constructor(p){super(p);this.state={failed:false};}static getDerivedStateFromError(){return{failed:true};}componentDidCatch(error){tell('runtime-fatal',{phase:'react-render',message:redactMessage(error?.message||'The application could not render.')});}render(){return this.state.failed?React.createElement('div',{role:'alert',style:{padding:24,color:'#a12934',fontFamily:'system-ui'}},'This website could not render. Open Diagnostics below to restart its preview.'):this.props.children;}}
   const recover=error=>report(diagnostic({error,context:'global-error'}));
   // HTML exports may create their own React roots. Keep the same rendering
   // boundary around those roots as the normal single-file JSX application.
   const StudentDOM={...ReactDOM,createRoot(container,options={}){const root=ReactDOM.createRoot(container,{...options,onRecoverableError(error,info){recover(error);options.onRecoverableError?.(error,info);}}),render=root.render.bind(root);root.render=node=>render(React.createElement(Boundary,null,node));return root;}};
   const StudentLegacyDOM={...LegacyDOM,render:(node,container,callback)=>LegacyDOM.render(React.createElement(Boundary,null,node),container,callback)};
   const exports={},module={exports};
   const require=name=>{if(name==='react')return React;if(name==='three')return Three;if(name==='react/jsx-runtime'||name==='react/jsx-dev-runtime')return JSXRuntime;if(name==='react-dom/client')return StudentDOM;if(name==='react-dom')return StudentLegacyDOM;if(name==='lucide-react')return Icons;if(['./styles.css','./style.css','./App.css','./index.css'].includes(name))return {};throw new Error('Package not included: '+name);};

  if(kind==='html'){
   const parsed=new DOMParser().parseFromString(source,'text/html');const scripts=[...parsed.querySelectorAll('script')];
   scripts.forEach(s=>s.remove());
   parsed.querySelectorAll('meta,base,link,iframe,object,embed').forEach(n=>n.remove());
   for(const s of parsed.head.querySelectorAll('style')){const copy=s.cloneNode(true);copy.textContent=resolveMedia(copy.textContent);document.head.appendChild(copy);}
   for(const node of parsed.querySelectorAll('[src],[poster],[style]'))for(const key of ['src','poster','style'])if(node.hasAttribute(key))node.setAttribute(key,resolveMedia(node.getAttribute(key)));
   document.body.innerHTML=parsed.body.innerHTML;
   for(const node of document.querySelectorAll('*'))for(const attr of [...node.attributes])if(/^on/i.test(attr.name)){node.removeAttribute(attr.name);node.addEventListener(attr.name.slice(2),new Function('event',attr.value+'\n//# sourceURL=web-hq-student-event.js'));}
   for(const script of compiled){if(script.module){new Function('React','require','module','exports',script.code+'\n//# sourceURL=web-hq-student-module.js')(React,require,{exports:{}},{});}else if(script.code)(0,eval)(script.code+'\n//# sourceURL=web-hq-student-inline.js');}
  }else{
   const Component=new Function('React','require','module','exports',compiled+'\n;return module.exports.default || (typeof App!=="undefined"?App:null);\n//# sourceURL=web-hq-student.jsx')(React,require,module,exports);
   if(!Component)throw new Error('Add export default to your main component.');
   function Ready(){React.useEffect(()=>{ready();},[]);return React.createElement(Component);}
   ReactDOM.createRoot(document.getElementById('root'),{onRecoverableError:error=>report(diagnostic({error,context:'global-error'}))}).render(React.createElement(Boundary,null,React.createElement(Ready)));

  }
  if(kind==='html')ready();
 }catch(error){document.body.textContent='This website could not start. Open Diagnostics below to restart its preview.';tell('runtime-fatal',{phase:'bootstrap',message:redactMessage(error?.message||'The application could not start.')});}
});
tell('booted');
