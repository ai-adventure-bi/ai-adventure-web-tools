// This file executes ONLY in /sandbox, which has both an HTTP sandbox policy
// and an iframe sandbox. It cannot access the studio origin, cookies or APIs.
const channel=location.hash.slice(1);
const tell=(type,data={})=>parent.postMessage({studio:channel,type,...data},'*');
window.addEventListener('error',e=>tell('error',{message:e.message}));
window.addEventListener('unhandledrejection',e=>tell('error',{message:String(e.reason?.message||e.reason)}));
document.addEventListener('click',e=>{const a=e.target.closest?.('a');if(!a)return;e.preventDefault();tell('navigate',{href:a.getAttribute('href')});},true);
document.addEventListener('submit',e=>e.preventDefault(),true);
const pending=new Map();
function boardCall(action,args={}){return new Promise((resolve,reject)=>{if(pending.size>=8)return reject(new Error('Please wait for your other leaderboard requests.'));const id=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(id);reject(new Error('Leaderboard request timed out.'));},15000);pending.set(id,{resolve,reject,timer});tell('leaderboard',{id,action,...args});});}
window.SiteStudio=Object.freeze({leaderboard:Object.freeze({list:(options={})=>boardCall('list',{order:options?.order==='asc'?'asc':'desc'}),submit:(name,score)=>boardCall('submit',{name,score})})});
window.addEventListener('message',e=>{if(e.source!==parent||e.data?.studio!==channel||e.data.type!=='leaderboard-result')return;const p=pending.get(e.data.id);if(!p)return;clearTimeout(p.timer);pending.delete(e.data.id);e.data.error?p.reject(new Error(e.data.error)):p.resolve(e.data.value);});
let mounted=false;
window.addEventListener('message',e=>{
 if(e.source!==parent||e.data?.studio!==channel||e.data.type!=='render'||mounted)return;
 mounted=true;
 const {compiled,source,css,kind,media={},linkMap={}}=e.data;
 const updateLinks=()=>{for(const a of document.querySelectorAll('a[href]')){const href=a.getAttribute('href');if(linkMap[href]&&linkMap[href]!==href)a.setAttribute('href',linkMap[href]);}};new MutationObserver(updateLinks).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
 const resolveMedia=value=>typeof value==='string'?value.replace(/studio-media:[a-f0-9-]{36}/g,key=>media[key]||key):value;
 try{
  const style=document.createElement('style');style.textContent='html,body,#root{height:100%;min-height:100%;margin:0}body{font-family:system-ui,sans-serif}button,a{touch-action:manipulation}button{cursor:pointer}'+resolveMedia(css);document.head.appendChild(style);
   const {React:OriginalReact,ReactDOM,LegacyDOM,Icons,Three,JSXRuntime}=window.StudioRuntime;
   const React={...OriginalReact,createElement(type,props,...children){if(props){props={...props};for(const key of ['src','poster','srcSet'])if(typeof props[key]==='string')props[key]=resolveMedia(props[key]);if(props.style){props.style={...props.style};for(const key of Object.keys(props.style))props.style[key]=resolveMedia(props.style[key]);}}return OriginalReact.createElement(type,props,...children);}};
   const exports={},module={exports};
   const require=name=>{if(name==='react')return React;if(name==='three')return Three;if(name==='react/jsx-runtime'||name==='react/jsx-dev-runtime')return JSXRuntime;if(name==='react-dom/client')return ReactDOM;if(name==='react-dom')return LegacyDOM;if(name==='lucide-react')return Icons;if(['./styles.css','./style.css','./App.css','./index.css'].includes(name))return {};throw new Error('Package not included: '+name);};

  if(kind==='html'){
   const parsed=new DOMParser().parseFromString(source,'text/html');const scripts=[...parsed.querySelectorAll('script')];
   scripts.forEach(s=>s.remove());
   parsed.querySelectorAll('meta,base,link,iframe,object,embed').forEach(n=>n.remove());
   for(const s of parsed.head.querySelectorAll('style')){const copy=s.cloneNode(true);copy.textContent=resolveMedia(copy.textContent);document.head.appendChild(copy);}
   for(const node of parsed.querySelectorAll('[src],[poster],[style]'))for(const key of ['src','poster','style'])if(node.hasAttribute(key))node.setAttribute(key,resolveMedia(node.getAttribute(key)));
   document.body.innerHTML=parsed.body.innerHTML;
   for(const node of document.querySelectorAll('*'))for(const attr of [...node.attributes])if(/^on/i.test(attr.name)){node.removeAttribute(attr.name);node.addEventListener(attr.name.slice(2),new Function('event',attr.value));}
   for(const script of compiled){if(script.module){new Function('React','require','module','exports',script.code)(React,require,{exports:{}},{});}else if(script.code)(0,eval)(script.code);}
  }else{
   const Component=new Function('React','require','module','exports',compiled+'\n;return module.exports.default || (typeof App!=="undefined"?App:null);')(React,require,module,exports);
   if(!Component)throw new Error('Add export default to your main component.');
   class Boundary extends React.Component{constructor(p){super(p);this.state={error:null};}static getDerivedStateFromError(error){return{error:error.message};}componentDidCatch(error){tell('error',{message:error.message});}render(){return this.state.error?React.createElement('div',{style:{padding:24,color:'#a12934'}},this.state.error):this.props.children;}}
   ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Boundary,null,React.createElement(Component)));
  }
  tell('ready');
 }catch(error){document.body.textContent=error.message;tell('error',{message:error.message});}
});
tell('booted');
