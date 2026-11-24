import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseClass} from '../src/class-selection.mjs';
import {codeChanges,parseTeaching,teachingForHunk,explainChange} from '../src/learning.mjs';
import {api,hashPassword} from '../server/app.mjs';
import {localDatabase} from '../scripts/db.mjs';

test('changing accounts discards inaccessible class IDs and preserves valid choices',()=>{
 assert.equal(chooseClass([{id:'birch'}],'oak'),'birch');
 assert.equal(chooseClass([{id:'oak'},{id:'birch'}],'birch'),'birch');
 assert.equal(chooseClass([],'oak'),'');
});
test('line changes preserve exact source and show correct before/after numbers',()=>{
 const before='const score = 0;\nconst title = "Quiz";\nreturn title;\n';
 const after='const score = 10;\nconst title = "Quiz";\nreturn title;\n';
 const result=codeChanges(before,after);assert.equal(result.added,1);assert.equal(result.removed,1);assert.equal(result.hunks.length,1);
 assert.equal(result.rows.filter(r=>r.type!=='added').map(r=>r.text).join('\n')+'\n',before);
 assert.equal(result.rows.filter(r=>r.type!=='removed').map(r=>r.text).join('\n')+'\n',after);
 assert.equal(result.hunks[0].rows[0].oldLine,1);assert.equal(result.hunks[0].rows[1].newLine,1);
 assert.equal(codeChanges(after,after).hunks.length,0);
 assert.equal(codeChanges('',after).added,3);
 const state=explainChange(codeChanges('const [count,setCount]=useState(0);','const [score,setScore]=useState(5);').hunks[0]);assert.equal(state.title,'Remembering a value');assert.match(state.observations[0],/from 0 to 5/);
});
test('teaching accepts only explanations linked to real changed code',()=>{
 const before='const score = 0;',after='const score = 10;';
 const item={before,after,explanation:'The starting score changes from zero to ten.',test:'Check the first score.',challenge:'Try a starting score of five.'};
 const reply='```json\n'+JSON.stringify({changes:[item,{...item,before:'not in the file'}]})+'\n```';
 const teaching=parseTeaching(reply,before,after);assert.equal(teaching.changes.length,1);
 assert.equal(teachingForHunk(codeChanges(before,after).hunks[0],teaching).explanation,item.explanation);
 assert.equal(parseTeaching('```json\nno json\n```',before,after),null);
 assert.equal(explainChange(codeChanges('<h1>Hello</h1>','<h1>Goodbye</h1>').hunks[0]).title,'Changing page content');
});
test('students browse without HeyOtto, and sharing/replacing keys cannot change membership',async()=>{
 const DB=localDatabase(),savedKeys=new Map(),oldFetch=globalThis.fetch,origin='https://studio.test';
 const env={DB,SUPABASE_URL:'https://vault.test',SUPABASE_SECRET_KEY:'sb_secret_fake-server-key'};
 const password=await hashPassword('test-password');
 const request=async(path,{cookie,data}={})=>{const r=await api(new Request(origin+'/api'+path,{method:data?'POST':'GET',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:data?JSON.stringify(data):undefined}),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
  for(const [id,role,cid]of [['teacher','admin',null],['a','student','oak'],['b','student','birch']])DB.raw.prepare('INSERT INTO users(id,username,name,password,role,class_id,permanent_id,vault_id) VALUES(?,?,?,?,?,?,?,?)').run(id,id,id,password,role,cid,id,'studio:'+id);
  for(const id of ['oak','birch'])DB.raw.prepare('INSERT INTO classes(id,name,slug,teacher,created) VALUES(?,?,?,?,?)').run(id,id,id,'teacher',1);
  const teacher=(await request('/login',{data:{username:'teacher',password:'test-password'}})).cookie;
  let previousClass='oak';
  for(const username of ['b','a','b','a']){const cookie=(await request('/login',{data:{username,password:'test-password'}})).cookie;const me=await request('/me',{cookie});previousClass=chooseClass(me.data.classes,previousClass);assert.equal((await request(`/classes/${previousClass}/projects`,{cookie})).status,200);assert.equal(me.data.user.keySaved,false);}
  globalThis.fetch=async(url,options)=>{assert.match(url,/oracle_save_key$/);const body=JSON.parse(options.body);savedKeys.set(body.account_id,body.api_key);return Response.json(true);};
  for(const who of ['a','b'])assert.equal((await request(`/users/${who}/key`,{cookie:teacher,data:{key:'shared-test-key'}})).status,200);
  await request('/users/a/key',{cookie:teacher,data:{key:'replacement-test-key'}});
  assert.equal(savedKeys.get('studio:b'),'shared-test-key');assert.equal(savedKeys.get('studio:a'),'replacement-test-key');
  assert.equal(DB.raw.prepare('SELECT class_id FROM users WHERE id=?').get('a').class_id,'oak');
  assert.equal(DB.raw.prepare('SELECT class_id FROM users WHERE id=?').get('b').class_id,'birch');
 }finally{globalThis.fetch=oldFetch;DB.close();}
});
