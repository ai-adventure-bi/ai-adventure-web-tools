import web from '../dist/server/index.js';
import {productionDatabase} from '../server/postgres.mjs';
export function createHandler({basePath='',environment=()=>process.env,database=productionDatabase}={}){return async function handler(req,res){
 try{
  const url=new URL(req.url,`https://${req.headers.host}`);
  if(typeof req.query?.route==='string'){url.pathname=basePath+'/'+req.query.route.replace(/^\//,'');url.searchParams.delete('route');}
  const internalPath=basePath?url.pathname.slice(basePath.length):url.pathname;
  const maxBytes=/^\/api\/projects\/[^/]+\/media$/.test(internalPath)?4400000:650000;
  let body;
  if(!['GET','HEAD'].includes(req.method)){
   if(req.body!==undefined)body=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);
   else {const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>maxBytes){res.statusCode=413;res.end('Request too large');return;}chunks.push(chunk);}body=Buffer.concat(chunks);}
   if(Buffer.byteLength(body||'')>maxBytes){res.statusCode=413;res.end('Request too large');return;}
  }
  const headers=new Headers();for(const [name,value]of Object.entries(req.headers)){if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(','):value);}
  const request=new Request(url,{method:req.method,headers,body});
  const env=environment();
  const response=await web.fetch(request,{...env,STUDIO_BASE_PATH:basePath,DB:database(env.DATABASE_URL),LOCAL_DEMO:'0'});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error('Studio function failed',error?.name||'Error');res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:'The studio database connection needs checking.'}));}
};}
export default createHandler();
