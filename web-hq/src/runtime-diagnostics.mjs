const extensionSource=/(?:chrome-extension|moz-extension|safari-extension|safari-web-extension|ms-browser-extension|extension):\/\//i;
const knownNames=new Set(['Error','TypeError','SyntaxError','ReferenceError','RangeError','URIError','EvalError','SecurityError','NotAllowedError','NotFoundError','NotReadableError','NotSupportedError','AbortError','TimeoutError']);
const read=(value,key)=>{try{return value?.[key];}catch{return undefined;}};
const string=value=>{try{return String(value??'').slice(0,4000);}catch{return 'Unreadable error';}};
export function redactMessage(value){return string(value)
 .replace(/(?:https?|postgres(?:ql)?|blob|chrome-extension|moz-extension|safari(?:-web)?-extension|ms-browser-extension):[^\s<>"')]+/gi,'[resource]')
 .replace(/\b(?:Bearer\s+\S+|sb_(?:secret|publishable)_[\w-]+|sk-[\w-]+|eyJ[\w-]+\.[\w-]+\.[\w-]+)\b/gi,'[credential]')
 .replace(/\b(api[_ -]?key|password|secret|token|authorization|cookie|session)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,'$1=[redacted]')
 .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[email]')
 .replace(/\b[A-Za-z0-9_-]{32,}\b/g,'[identifier]').slice(0,500);}
export function diagnostic(input={}){
 const error=read(input,'error'),context=string(read(input,'context')||'global-error');
 const provenance=string(read(input,'filename'))+' '+string(read(error,'stack'));
 const name=knownNames.has(read(error,'name'))?read(error,'name'):'Error';
 const external=extensionSource.test(provenance),student=/web-hq-student(?:[-.\w]*)/i.test(provenance);
 const fatal=['compile','react-render','bootstrap'].includes(context);
 const category=context==='compile'?'compile':context==='react-render'?'render':context==='bootstrap'?'bootstrap':external?'external-extension':context==='resource'?'resource':context==='permission'||['NotAllowedError','SecurityError','NotSupportedError'].includes(name)?'permission':student?'runtime':context==='host'?'host':'unknown';
 const source=external?'extension':student?'student-app':context==='host'?'host':context==='resource'?'resource':'unknown';
 const line=Number(read(input,'line')||read(error,'lineNumber')||0),column=Number(read(input,'column')||0);
 return {category,source,context:['compile','react-render','bootstrap','global-error','unhandledrejection','resource','permission','host','webgl'].includes(context)?context:'global-error',name,fatal,severity:fatal?'fatal':category==='runtime'?'error':'warning',message:redactMessage(read(input,'message')||read(error,'message')||error||'An unknown browser error occurred.'),line:Number.isSafeInteger(line)&&line>=0&&line<1000000?line:0,column:Number.isSafeInteger(column)&&column>=0&&column<1000000?column:0};
}
export function addDiagnostic(records,item){
 const key=[item.category,item.source,item.context,item.name,item.message,item.line,item.column].join('|');
 const found=records.find(r=>r.key===key);if(found)return records.map(r=>r===found?{...r,count:Math.min(999,r.count+1)}:r);
 return [...records.slice(-39),{...item,key,count:1}];
}
export function safeDiagnosticMessage(data){
 if(!data||typeof data!=='object'||typeof data.message!=='string'||data.message.length>500)return null;
 const contexts=new Set(['compile','react-render','bootstrap','global-error','unhandledrejection','resource','permission','host','webgl']);
 const categories=new Set(['compile','render','bootstrap','external-extension','runtime','permission','resource','unknown','host']);
 if(!contexts.has(data.context)||!categories.has(data.category))return null;
 const entry=diagnostic({context:'global-error',message:data.message,line:data.line,column:data.column});
 return {...entry,category:data.category,source:['extension','student-app','host','resource','unknown'].includes(data.source)?data.source:'unknown',context:data.context,name:knownNames.has(data.name)?data.name:'Error',fatal:false,severity:data.category==='runtime'?'error':'warning'};
}
export function isRuntimeMessage(event,frame,token){return !!frame&&event.source===frame&&event.origin==='null'&&event.data&&typeof event.data==='object'&&event.data.studio===token&&typeof event.data.type==='string';}
export function isParentMessage(event,parent,origin,token){return event.source===parent&&event.origin===origin&&event.data&&typeof event.data==='object'&&event.data.studio===token;}
export function diagnosticReport(records,capabilities={},phase='unknown'){
 // Never export raw error messages/stacks, source, URLs, account IDs or stored state.
 const features={};for(const key of ['pointerLock','fullscreen','downloads','touch','webglAPI','localStorage','camera','microphone'])if(typeof capabilities[key]==='boolean')features[key]=capabilities[key];
 return JSON.stringify({application:'Web HQ',format:1,phase:['preparing','starting','running','failed'].includes(phase)?phase:'unknown',capabilities:features,events:records.slice(-40).map(({category,source,context,name,line,column,count,fatal})=>({category,source,context,name,line,column,count,fatal})),privacy:'Messages, stacks, URLs, code and user data omitted.'},null,2);
}
export function installRuntimeObservers(target,report,context='sandbox'){
 const handlers=[];const listen=(object,type,fn,capture=false)=>{object?.addEventListener(type,fn,capture);handlers.push(()=>object?.removeEventListener(type,fn,capture));};
 listen(target,'error',event=>{
  if(event.target&&event.target!==target&&read(event.target,'tagName'))report(diagnostic({context:'resource',message:'A page resource could not be loaded.'}));
  else report(diagnostic({context:context==='host'?'host':'global-error',error:event.error,message:event.message,filename:event.filename,line:event.lineno,column:event.colno}));
 },true);
 listen(target,'unhandledrejection',event=>report(diagnostic({context:'unhandledrejection',error:event.reason,message:read(event.reason,'message')||event.reason})));
 listen(target.document,'securitypolicyviolation',()=>report(diagnostic({context:'resource',message:'A resource or browser operation was blocked by the page security policy.'})));
 listen(target.document,'webglcontextlost',()=>report(diagnostic({context:'webgl',message:'The graphics context was lost. The game may recover; otherwise restart its preview.'})),true);
 listen(target.document,'webglcontextcreationerror',()=>report(diagnostic({context:'resource',message:'WebGL could not start. This device or browser may not support this game.'})),true);
 for(const type of ['pointerlockerror','fullscreenerror'])listen(target.document,type,()=>report(diagnostic({context:'permission',message:'The browser declined '+(type==='pointerlockerror'?'pointer lock. Use touch/drag controls if available.':'fullscreen. The game can continue inside this page.')})));
 // Deliberately do not preventDefault, stop propagation, replace onerror, or unmount anything.
 return()=>handlers.forEach(remove=>remove());
}
