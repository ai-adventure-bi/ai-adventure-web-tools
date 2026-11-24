import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api,hashPassword} from '../server/app.mjs';
import {localDatabase} from '../scripts/db.mjs';

test('HeyOtto suggestions retain their exact before/after code and teaching, and questions never edit drafts',async()=>{
 const DB=localDatabase(),oldFetch=globalThis.fetch,env={DB,SUPABASE_URL:'https://vault.test',SUPABASE_SECRET_KEY:'sb_secret_fake'},password=await hashPassword('test-password');
 const call=async(path,cookie,data)=>{const r=await api(new Request('https://test/api'+path,{method:data?'POST':'GET',headers:{origin:'https://test','content-type':'application/json',...(cookie?{cookie}:{})},body:data?JSON.stringify(data):undefined}),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
 DB.raw.prepare('INSERT INTO classes(id,name,slug,teacher,created) VALUES(?,?,?,?,?)').run('oak','Oak','oak','teacher',1);
 for(const id of ['a','b'])DB.raw.prepare('INSERT INTO users(id,username,name,password,role,class_id,permanent_id,vault_id,key_saved) VALUES(?,?,?,?,?,?,?,?,1)').run(id,id,id,password,'student','oak',id,'studio:'+id);
 const a=(await call('/login',null,{username:'a',password:'test-password'})).cookie,b=(await call('/login',null,{username:'b',password:'test-password'})).cookie;
 const pid=(await call('/projects',a,{classId:'oak',title:'My game'})).data.id;
 const before="export default function App(){return <h1>Old heading</h1>}";
 DB.raw.prepare('UPDATE projects SET source=? WHERE id=?').run(before,pid);
 const after=before.replace('Old heading','New heading'),teaching={changes:[{before:'Old heading',after:'New heading',explanation:'The heading text is now different.',test:'Look at the heading.',challenge:'Change one word.'}]};
 let mode='change';
 globalThis.fetch=async(url,options)=>{if(url.includes('oracle_read_key'))return Response.json('fake-key');const task=JSON.parse(options.body).messages[0].content;
 if(mode==='question'){assert.match(task,/QUESTION MODE/);assert.match(task,/Unsaved heading/);assert.match(task,/Selected code:/);return Response.json({choices:[{message:{content:'The h1 element makes a large heading. Find the text inside the h1 tags.'}}]});}
 return Response.json({choices:[{message:{content:'```jsx\n'+after+'\n```\n```json\n'+JSON.stringify(teaching)+'\n```'}}]});};
 const reply=await call(`/projects/${pid}/assist`,a,{revision:0,prompt:'Change the heading'});assert.equal(reply.status,200);assert.ok(reply.data.versionId);
 const versions=(await call(`/projects/${pid}/versions`,a)).data.versions;assert.equal(versions.length,1);assert.equal(versions[0].origin,'heyotto');
 const detail=(await call(`/projects/${pid}/versions/${reply.data.versionId}`,a)).data.version;assert.equal(detail.source,after);assert.equal(detail.before_source,before);assert.deepEqual(detail.teaching,teaching);assert.equal(detail.request,'Change the heading');
 assert.equal((await call(`/projects/${pid}`,a)).data.project.source,before);
 assert.equal((await call(`/projects/${pid}/versions/${reply.data.versionId}`,b)).status,403);
 mode='question';const unsaved=before.replace('Old heading','Unsaved heading');
 const answer=await call(`/projects/${pid}/question`,a,{revision:0,prompt:'What is h1?',source:unsaved,css:'h1{color:blue}',kind:'jsx',selection:{from:0,to:20}});assert.equal(answer.status,200);assert.match(answer.data.question.answer,/large heading/);
 assert.equal((await call(`/projects/${pid}/questions`,a)).data.questions.length,1);
 assert.equal((await call(`/projects/${pid}/questions`,b)).status,403);
 assert.equal((await call(`/projects/${pid}`,a)).data.project.source,before);assert.equal((await call(`/projects/${pid}`,a)).data.project.revision,0);
 assert.equal((await call(`/projects/${pid}/versions`,a)).data.versions.length,1);
 assert.equal((await call(`/projects/${pid}/restore`,a,{versionId:detail.id,revision:0})).status,200);
 assert.equal((await call(`/projects/${pid}`,a)).data.project.source,after);
 assert.equal((await call(`/projects/${pid}/versions/${detail.id}`,a)).data.version.teaching.changes[0].explanation,teaching.changes[0].explanation);
 }finally{globalThis.fetch=oldFetch;DB.close();}
});
