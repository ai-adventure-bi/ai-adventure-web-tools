import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api,hashPassword} from '../server/app.mjs';
import {localDatabase} from '../scripts/db.mjs';
test('AI receives actual uploaded references and cannot silently omit a requested file',async()=>{
 const DB=localDatabase(),oldFetch=globalThis.fetch,origin='https://studio.test';
 const env={DB,SUPABASE_URL:'https://vault.test',SUPABASE_SECRET_KEY:'sb_secret_fake-server'};
 const call=async(path,data,cookie)=>{const r=await api(new Request(origin+'/api'+path,{method:data?'POST':'GET',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:data?JSON.stringify(data):undefined}),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
  DB.raw.prepare('INSERT INTO classes(id,name,slug,teacher,created) VALUES(?,?,?,?,?)').run('oak','Oak','oak','teacher',1);
  DB.raw.prepare('INSERT INTO users(id,username,name,password,role,class_id,permanent_id,vault_id,key_saved) VALUES(?,?,?,?,?,?,?,?,1)').run('a','a','A',await hashPassword('test-password'),'student','oak','a','studio:a');
  const cookie=(await call('/login',{username:'a',password:'test-password'})).cookie;
  const pid=(await call('/projects',{classId:'oak',title:'Photos'},cookie)).data.id;
  const marker='studio-media:12345678-1234-1234-1234-123456789abc';
  DB.raw.prepare('INSERT INTO media VALUES(?,?,?,?,?,?,?)').run(marker.slice(13),pid,'My actual photo.png','image/png',1,'data:image/png;base64,AA==',1);
  let include=false;
  globalThis.fetch=async(url,options)=>{
   if(url.includes('oracle_read_key'))return Response.json('test-key');
   const task=JSON.parse(options.body).messages[0].content;assert.ok(task.includes('My actual photo.png'));assert.ok(task.includes(marker));assert.ok(task.includes('Never replace a supplied image with an SVG'));
   assert.ok(task.includes('built-in persistent online leaderboard'));assert.ok(task.includes('never ask the player to type their score'));assert.ok(task.includes("order:'asc'"));assert.ok(!task.includes('Ask the student to enable Online leaderboard'));
   return Response.json({choices:[{message:{content:'```jsx\nexport default function App(){return '+(include?`<img src="${marker}" alt="Photo"/>`:'<svg/>')+';}\n```\n```json\n'+JSON.stringify({summary:'I replaced the placeholder drawing with your uploaded photo, using its exact media reference in an img element.'})+'\n```'}}]});
  };
  const missing=await call(`/projects/${pid}/assist`,{revision:0,prompt:'Use my photo '+marker},cookie);assert.equal(missing.status,422);assert.match(missing.data.error,/left out/);
  include=true;assert.equal((await call(`/projects/${pid}/assist`,{revision:0,prompt:'Use my photo '+marker},cookie)).status,200);
  let calls=0,mode='timeout';
  globalThis.fetch=async url=>{if(url.includes('oracle_read_key'))return Response.json('test-key');calls++;if(mode==='timeout')throw new DOMException('simulated','TimeoutError');if(mode==='network')throw new TypeError('simulated network failure');if(mode==='body-timeout')return {ok:true,json:async()=>{throw new DOMException('simulated','TimeoutError');}};return new Response('incomplete JSON');};
  for(const scenario of ['timeout','network','body-timeout','invalid-json']){mode=scenario;const result=await call(`/projects/${pid}/assist`,{revision:0,prompt:'Change the title'},cookie);assert.equal(result.status,scenario.includes('timeout')?504:502);assert.match(result.data.error,/history/);assert.match(result.data.error,/No code was changed/);if(scenario.includes('timeout'))assert.match(result.data.error,/105 seconds/);}
  assert.equal(calls,4,'failed requests must not be resent automatically');
  assert.equal((await call(`/projects/${pid}`,undefined,cookie)).data.project.revision,0);
 }finally{globalThis.fetch=oldFetch;DB.close();}
});
