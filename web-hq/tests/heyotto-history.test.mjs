import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api,hashPassword} from '../server/app.mjs';
import {localDatabase} from '../scripts/db.mjs';

test('a missing code explanation triggers one explanation-only follow-up; unexplained suggestions are rejected',async()=>{
 const DB=localDatabase(),previousFetch=globalThis.fetch,env={DB,SUPABASE_URL:'https://vault.test',SUPABASE_SECRET_KEY:'sb_secret_fake'};
 const call=async(path,data,cookie)=>{const r=await api(new Request('https://test/api'+path,{method:'POST',headers:{origin:'https://test','content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(data)}),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
  DB.raw.prepare("INSERT INTO classes(id,name,slug,teacher,created) VALUES('oak','Oak','oak','teacher',1)").run();
  DB.raw.prepare("INSERT INTO users(id,username,name,password,role,class_id,permanent_id,vault_id,key_saved) VALUES('a','a','A',?,'student','oak','a','studio:a',1)").run(await hashPassword('test-password'));
  const cookie=(await call('/login',{username:'a',password:'test-password'})).cookie;
  const pid=(await call('/projects',{classId:'oak',title:'Space game'},cookie)).data.id;
  let followups=0,explain=true;
  const after='export default function App(){return <button>Launch rocket</button>}';
  globalThis.fetch=async(url,options)=>{if(url.includes('oracle_read_key'))return Response.json('fake-key');const prompt=JSON.parse(options.body).messages[0].content;
   if(prompt.startsWith('EXPLANATION ONLY.')){followups++;assert.match(prompt,/Space game/);assert.match(prompt,/Launch rocket/);return Response.json({choices:[{message:{content:explain?JSON.stringify({summary:'In Space game, I replaced the opening heading with a Launch rocket button. A button is a control the player can tap; this change adds its appearance but no launch action yet.'}):'No explanation'}}]});}
   return Response.json({choices:[{message:{content:'```jsx\n'+after+'\n```'}}]});};
  const result=await call(`/projects/${pid}/assist`,{revision:0,prompt:'Add a launch rocket button'},cookie);assert.equal(result.status,200);assert.equal(followups,1);assert.match(result.data.teaching.summary,/Space game/);assert.equal(result.data.teaching.changes.length,0);
  const version=DB.raw.prepare('SELECT * FROM versions WHERE id=?').get(result.data.versionId);assert.match(JSON.parse(version.teaching).summary,/Launch rocket/);
  assert.notEqual(DB.raw.prepare('SELECT source FROM projects WHERE id=?').get(pid).source,after);
  explain=false;const rejected=await call(`/projects/${pid}/assist`,{revision:0,prompt:'Add a launch rocket button'},cookie);assert.equal(rejected.status,422);assert.match(rejected.data.error,/without a usable explanation/);assert.equal(DB.raw.prepare('SELECT count(*) AS n FROM versions WHERE project_id=?').get(pid).n,1);assert.equal(followups,2);
 }finally{globalThis.fetch=previousFetch;DB.close();}
});

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
 const after=before.replace('Old heading','New heading'),teaching={summary:'In My game, I changed the main heading from Old heading to New heading without changing its h1 element.',changes:[{before:'Old heading',after:'New heading',explanation:'The heading text is now different.',test:'Look at the heading.',challenge:'Change one word.'}]};
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
