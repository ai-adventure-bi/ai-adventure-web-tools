import {withBase} from './base-path.mjs';
export function mediaIds(source){return [...new Set(source.match(/studio-media:[a-f0-9-]{36}/g)||[])].map(s=>s.slice(13));}
export async function resolveMedia(source){
 const ids=mediaIds(source);if(ids.length>20)throw new Error('A page can use up to 20 uploaded media files.');
 const pairs=await Promise.all(ids.map(async id=>{const response=await fetch(withBase('/api/media/'+id));if(!response.ok)throw new Error('A media file is unavailable. Check that it belongs to this site and class.');const data=await response.json();return ['studio-media:'+id,data.dataUrl];}));
 return Object.fromEntries(pairs);
}
export function mediaSnippet(src,name,type='image',format='jsx'){
 if(!src.startsWith('studio-media:')){const url=new URL(src);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use a direct HTTPS media URL.');src=url.href;}
 if(format==='html'){const escape=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');return type==='video'?`<video controls playsinline preload="metadata" src="${escape(src)}" style="max-width:100%"></video>`:`<img src="${escape(src)}" alt="${escape(name||'Describe this image')}" style="max-width:100%">`;}
 return type==='video'?`<video controls playsInline preload="metadata" src={${JSON.stringify(src)}} style={{maxWidth: '100%'}} />`:`<img src={${JSON.stringify(src)}} alt={${JSON.stringify(name||'Describe this image')}} style={{maxWidth: '100%'}} />`;
}
