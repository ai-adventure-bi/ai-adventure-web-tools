import {createServer} from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import {localDatabase} from './db.mjs';
import {hashPassword} from '../server/app.mjs';
import {starter} from '../src/starters.mjs';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import worker from '../dist/server/index.js';
await mkdir('.local',{recursive:true});
const demo=process.argv.includes('--demo');
const DB=localDatabase(demo?'.local/demo.sqlite':process.env.STUDIO_LOCAL_DB||'.local/classroom.sqlite');
if(demo&&!(await DB.prepare('SELECT id FROM users LIMIT 1').first())){
 const teacher=await hashPassword('teach-stars-26'),student=await hashPassword('create-stars-26');
 await DB.prepare('INSERT INTO classes(id,name,slug,teacher,created) VALUES(?,?,?,?,?)').bind('oak','Oak class','oak-class','teacher',Date.now()).run();
 for(const [uid,name,role,pw] of [['teacher','Jamie Harper','admin',teacher],['alex','Alex Rivers','student',student],['maya','Maya Chen','student',student],['sam','Sam Taylor','student',student],['leo','Leo Woods','student',student],['ella','Ella Green','student',student]]){
  await DB.prepare('INSERT INTO users(id,username,name,password,role,class_id,permanent_id,vault_id) VALUES(?,?,?,?,?,?,?,?)').bind(uid,role==='student'?('DEMO-'+uid).toLowerCase():uid,name,pw,role,'oak','DEMO-'+uid,'studio:demo:'+uid).run();
 }
 const items=[['alex','My website','blank','lavender','My first website.'],['maya','Quiz','quiz','mint','Try these three questions.'],['sam','Star game','game','peach','Tap the star to score points.'],['leo','About me','portfolio','sky','Some of my favourite things.']];
 for(const [owner,title,type,colour,description] of items){const pid='demo-'+owner,vid='version-'+owner,slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-');await DB.prepare('INSERT INTO projects(id,owner,class_id,slug,title,description,source,updated,colour,published_id) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(pid,owner,'oak',slug,title,description,starter(type),Date.now(),colour,vid).run();await DB.prepare('INSERT INTO versions(id,project_id,source,css,kind,title,description,revision,created,label,published) VALUES(?,?,?,?,?,?,?,?,?,?,1)').bind(vid,pid,starter(type),'','jsx',title,description,0,Date.now(),'Published').run();}
 console.log('Fictional demo class seeded. Student: DEMO-alex / create-stars-26. Teacher: teacher / teach-stars-26.');
}
const env={...process.env,DB,LOCAL_DEMO:demo?'1':'0',HEYOTTO_TIMEOUT_MS:process.env.HEYOTTO_TIMEOUT_MS||'180000'};
if(!demo&&!env.STUDIO_SETUP_TOKEN&&!(await DB.prepare('SELECT id FROM users LIMIT 1').first())){
 let savedCode='';
 try{savedCode=(await readFile('.local/teacher-setup.txt','utf8')).match(/\n\n([a-f0-9]{64})\n/)?.[1]||'';}catch(error){if(error.code!=='ENOENT')throw error;}
 env.STUDIO_SETUP_TOKEN=savedCode||randomBytes(32).toString('hex');
 await writeFile('.local/teacher-setup.txt',`Site Studio teacher setup code\n\n${env.STUDIO_SETUP_TOKEN}\n\nOpen the local studio, choose Teacher? Set up this studio, and use this code to create your teacher account.\n`,{mode:0o600});
 console.log('Teacher setup code: '+resolve('.local/teacher-setup.txt'));
}
const port=Number(process.env.PORT||4185);
const server=createServer(async(req,res)=>{try{const chunks=[];let bytes=0;const maxBytes=/^\/api\/projects\/[^/]+\/media(?:\?|$)/.test(req.url)?4400000:650000;for await(const chunk of req){bytes+=chunk.length;if(bytes>maxBytes){res.writeHead(413);res.end('Too large');return;}chunks.push(chunk);}const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const response=await worker.fetch(request,env,{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Local server error');}});
server.listen(port,'127.0.0.1',()=>console.log(`Site Studio: http://127.0.0.1:${port}`));
process.on('SIGINT',()=>server.close(()=>{DB.close();process.exit();}));
