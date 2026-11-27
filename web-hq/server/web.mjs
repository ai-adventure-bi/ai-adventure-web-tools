import {api} from './app.mjs';
import {assets} from '../dist/assets.mjs';
export default {async fetch(request,env){
 const base=env.STUDIO_BASE_PATH||'';const url=new URL(request.url);
 if(base){if(url.pathname!==base&&!url.pathname.startsWith(base+'/'))return new Response('Not found',{status:404});url.pathname=url.pathname.slice(base.length)||'/';request=new Request(url,request);}
 const path=url.pathname;
 if(path.startsWith('/api/'))return api(request,env);
 if(path==='/sandbox'){
  const origin=new URL(request.url).origin;
  const policy=`sandbox allow-scripts allow-pointer-lock allow-downloads; default-src 'none'; script-src 'unsafe-eval' ${origin}${base}/assets/runtime.js ${origin}${base}/assets/sandbox.js ${origin}${base}/assets/tailwind.js; style-src 'unsafe-inline'; img-src data: blob: https:; media-src data: blob: https:; connect-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'`;
  const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script defer src="/assets/runtime.js"></script><script defer src="/assets/tailwind.js"></script><script defer src="/assets/sandbox.js"></script></head><body><div id="root"></div></body></html>';
  return new Response(html.replaceAll('/assets/',base+'/assets/'),{headers:{'content-type':'text/html; charset=utf-8','content-security-policy':policy,'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'}});
 }
 const asset=assets[path]||(!path.startsWith('/assets/')?assets['/']:null);
 if(!asset)return new Response('Not found',{status:404});
 const headers={'content-type':asset.type,'x-content-type-options':'nosniff','referrer-policy':'same-origin','cache-control':/\/assets\/(app-|chunk-)/.test(path)?'public, max-age=31536000, immutable':path.startsWith('/assets/')?'no-cache':'no-store'};
 if(asset.type.startsWith('text/html'))headers['content-security-policy']="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-src 'self' about:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'";
 return new Response(request.method==='HEAD'?null:asset.type.startsWith('text/html')?asset.body.replaceAll('/assets/',base+'/assets/'):asset.body,{headers});
}};
