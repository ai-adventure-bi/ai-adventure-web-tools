import {withBase} from './base-path.mjs';
export function mediaIds(source){return [...new Set(source.match(/studio-media:[a-f0-9-]{36}/g)||[])].map(s=>s.slice(13));}
export async function resolveMedia(source,{tolerant=false,onWarning=()=>{}}={}){
 const ids=mediaIds(source);if(ids.length>20)throw new Error('A page can use up to 20 uploaded media files.');
 const pairs=await Promise.all(ids.map(async id=>{const controller=typeof AbortController==='function'?new AbortController():null;const timer=controller?setTimeout(()=>controller.abort(),8000):null;try{const response=await fetch(withBase('/api/media/'+id),{signal:controller?.signal});if(response.status===404&&tolerant){onWarning('An uploaded file is missing or was removed.');return ['studio-media:'+id,'data:image/png;base64,'];}if(!response.ok)throw new Error('A media file is unavailable. Check that it belongs to this site and class.');const data=await response.json();if(typeof data.dataUrl!=='string')throw new Error('A media file could not be read.');return ['studio-media:'+id,data.dataUrl];}catch(error){if(!tolerant)throw error;onWarning('An uploaded image or video could not load. Other parts of the page can still run.');return ['studio-media:'+id,'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='];}finally{if(timer)clearTimeout(timer);}}));
 return Object.fromEntries(pairs);
}
export function mediaSnippet(src,name,type='image',format='jsx'){
 if(!src.startsWith('studio-media:')){const url=new URL(src);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use a direct HTTPS media URL.');src=url.href;}
 if(format==='html'){const escape=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');return type==='video'?`<video controls playsinline preload="metadata" src="${escape(src)}" style="max-width:100%"></video>`:`<img src="${escape(src)}" alt="${escape(name||'Describe this image')}" style="max-width:100%">`;}
 return type==='video'?`<video controls playsInline preload="metadata" src={${JSON.stringify(src)}} style={{maxWidth: '100%'}} />`:`<img src={${JSON.stringify(src)}} alt={${JSON.stringify(name||'Describe this image')}} style={{maxWidth: '100%'}} />`;
}
