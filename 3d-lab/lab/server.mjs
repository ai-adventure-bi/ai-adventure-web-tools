import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import handler from './api.mjs';
import login from '../../api/topbot-admin-login.mjs';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'};
export const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/3d-lab')return await handler(req,res);
  if(url.pathname==='/api/topbot-admin-login')return await login(req,res);
  const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  // Deliberate allow-list: never expose source, SQL, environment files or tests.
  if(!(name==='index.html'||/^(lab\/(workshop|workshop-panel|floating|selection-cut|contact|files|mesh|ui|policy|codes|on-object|print-room|teacher-controller)\.(js|mjs)|lab\/(style|workshop|interface|feedback)\.css|vendor\/[\w.-]+\.js)$/.test(name))){res.writeHead(404);return res.end('Not found');}
  const path=resolve(root,name);if(!path.startsWith(root+sep)&&path!==resolve(root,'index.html'))throw Error();
  const data=await readFile(path);res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
});
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const envPath=resolve(root,'.env');if(existsSync(envPath))process.loadEnvFile(envPath);
 server.listen(Number(process.env.PORT||4174),'127.0.0.1',()=>console.log('3D Lab: http://127.0.0.1:'+ (process.env.PORT||4174)));
}
