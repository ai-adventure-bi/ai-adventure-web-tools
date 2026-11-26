import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api,hashPassword,extractCode} from '../server/app.mjs';
import {localDatabase} from '../scripts/db.mjs';
import {compile} from '../src/compiler.mjs';
import {templates,starter} from '../src/starters.mjs';
const origin='https://studio.test';
async function fixture(){
 const DB=localDatabase(),env={DB,STUDIO_SETUP_TOKEN:'test-only-long-setup-token'};
 const pw=await hashPassword('student-password');
 for(const [uid,role,cid]of [['teacher','admin','oak'],['a','student','oak'],['b','student','oak'],['c','student','pine'],['otherteacher','teacher','pine']])await DB.prepare('INSERT INTO users(id,username,name,password,role,class_id,permanent_id,vault_id) VALUES(?,?,?,?,?,?,?,?)').bind(uid,uid,uid,pw,role,cid,'id-'+uid,'studio:'+uid).run();
 for(const [cid,teacher]of [['oak','teacher'],['pine','otherteacher']])await DB.prepare('INSERT INTO classes(id,name,slug,teacher,created) VALUES(?,?,?,?,?)').bind(cid,cid,cid,teacher,1).run();
 const request=async(path,{method='GET',data,cookie,from=origin}={})=>{const headers={origin:from,'content-type':'application/json'};if(cookie)headers.cookie=cookie;const response=await api(new Request(origin+'/api'+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)}),env);return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};};
 const login=async who=>(await request('/login',{method:'POST',data:{username:who,password:'student-password'}})).cookie;
 return {DB,env,request,login};
}
test('ownership, class access, publication snapshots, stale saves and restoration',async()=>{
 const f=await fixture();try{
 const a=await f.login('a'),b=await f.login('b'),c=await f.login('c'),teacher=await f.login('teacher');
 assert.equal((await f.request('/me')).status,401);
 assert.equal((await f.request('/classes/pine/projects',{cookie:a})).status,404);
 const created=await f.request('/projects',{method:'POST',cookie:a,data:{classId:'oak',title:'My website',template:'quiz'}});assert.equal(created.status,200);const pid=created.data.id;
 assert.equal((await f.request('/projects/'+pid,{cookie:b})).status,403);
 assert.equal((await f.request('/projects/'+pid,{cookie:c})).status,404);
 assert.equal((await f.request('/projects/'+pid,{cookie:teacher})).status,200);
 assert.equal((await f.request('/classes/oak/projects',{cookie:b})).data.projects.length,0);
 const p=(await f.request('/projects/'+pid,{cookie:a})).data.project;
 assert.equal((await f.request(`/projects/${pid}/save`,{method:'POST',cookie:b,data:{...p,source:'stolen'}})).status,403);
 const saved=await f.request(`/projects/${pid}/save`,{method:'POST',cookie:a,data:{...p,title:'Version one',description:'Published description'}});assert.equal(saved.status,200);
 assert.equal((await f.request(`/projects/${pid}/save`,{method:'POST',cookie:a,data:{...p,title:'Stale'}})).status,409);
 assert.equal((await f.request(`/projects/${pid}/publish`,{method:'POST',cookie:a,data:{revision:0}})).status,409);
 assert.equal((await f.request(`/projects/${pid}/publish`,{method:'POST',cookie:a,data:{revision:1}})).status,200);
 const publishedUrl=`/published/oak/${p.slug}`;
 assert.equal((await f.request(publishedUrl,{cookie:b})).data.site.title,'Version one');
 const draft=await f.request(`/projects/${pid}/save`,{method:'POST',cookie:a,data:{...saved.data.project,title:'Private draft two',source:starter('blank'),description:'Do not disclose'}});assert.equal(draft.status,200);
 assert.equal((await f.request(publishedUrl,{cookie:b})).data.site.title,'Version one');
 const gallery=await f.request('/classes/oak/projects',{cookie:b});assert.equal(gallery.data.projects[0].title,'Version one');assert.ok(!JSON.stringify(gallery.data).includes('Do not disclose'));
 assert.equal((await f.request(publishedUrl,{cookie:c})).status,404);
 const history=(await f.request(`/projects/${pid}/versions`,{cookie:a})).data.versions;
 assert.equal((await f.request(`/projects/${pid}/restore`,{method:'POST',cookie:a,data:{versionId:history.find(v=>v.label==='Published').id,revision:2}})).status,200);
 assert.equal((await f.request(`/projects/${pid}/unpublish`,{method:'POST',cookie:b,data:{}})).status,403);
 assert.equal((await f.request(`/projects/${pid}/unpublish`,{method:'POST',cookie:teacher,data:{}})).status,200);
 assert.equal((await f.request(publishedUrl,{cookie:b})).status,404);
 }finally{f.DB.close();}
});
test('CSRF, password resets, teacher scopes and secure key boundary',async()=>{
 const f=await fixture();try{
 const a=await f.login('a'),teacher=await f.login('teacher'),other=await f.login('otherteacher');
 assert.equal((await f.request('/classes',{method:'POST',cookie:a,data:{name:'Bad'}})).status,403);
 assert.equal((await f.request('/classes/oak/roster',{cookie:other})).status,404);
 assert.equal((await f.request('/users/a/key',{method:'POST',cookie:a,data:{key:'must-not-save'}})).status,403);
 assert.equal((await f.request('/users/a/key',{method:'POST',cookie:teacher,data:{key:'test-no-provider'}})).status,503);
 for(const from of ['null','https://evil.test'])assert.equal((await f.request('/classes',{method:'POST',cookie:teacher,from,data:{name:'Bad'}})).status,403);
 assert.equal((await f.request('/users/a/password',{method:'POST',cookie:teacher,data:{password:'new-secret-password'}})).status,200);
 assert.equal((await f.request('/me',{cookie:a})).status,401);
 const roster=await f.request('/classes/oak/roster',{cookie:teacher});assert.ok(!JSON.stringify(roster.data).includes('password'));assert.ok(!JSON.stringify(roster.data).includes('vault_id'));
 assert.equal((await f.request('/setup',{method:'POST',data:{token:f.env.STUDIO_SETUP_TOKEN,username:'intruder',password:'long-password',name:'New admin'}})).status,409);
 }finally{f.DB.close();}
});
test('all templates compile and unsupported dependencies fail clearly',()=>{
 for(const t of templates)assert.ok(compile(starter(t.id)).includes('exports.default'));
 assert.throws(()=>compile("import {motion} from 'framer-motion'; export default function App(){return <div/>}"),/not included/);
 assert.throws(()=>compile("export default function App(){return <div}"));
 assert.throws(()=>compile("export default function App(){import('https://evil.test'); return <div/>}"),/Dynamic imports/);
});
test('AI extraction rejects ambiguous multiple files and missing code',()=>{
 assert.match(extractCode('```jsx\nexport default function App(){return <h1>Hello</h1>}\n```','jsx'),/export default/);
 assert.throws(()=>extractCode('Here are some tips.','jsx'),/complete React/);
 assert.throws(()=>extractCode('```jsx\nexport default function A(){}\n```\n```jsx\nexport default function B(){}\n```','jsx'),/multiple files/);
});
test('AI proposals use the actor’s Vault key and preserve code outside the selection',async()=>{
 const f=await fixture(),originalFetch=globalThis.fetch;try{
  const cookie=await f.login('a');const pid=(await f.request('/projects',{method:'POST',cookie,data:{classId:'oak',title:'AI test'}})).data.id;
  const p=(await f.request('/projects/'+pid,{cookie})).data.project;const selected='My website',from=p.source.indexOf(selected),to=from+selected.length;
  await f.DB.prepare('UPDATE users SET key_saved=1 WHERE id=?').bind('a').run();
  f.env.SUPABASE_URL='https://vault.test';f.env.SUPABASE_SECRET_KEY='sb_secret_test-server-only';
  let calls=0;
  globalThis.fetch=async(url,options)=>{calls++;
   if(url==='https://vault.test/rest/v1/rpc/oracle_read_key'){assert.deepEqual(JSON.parse(options.body),{account_id:'studio:a'});return Response.json('test-student-secret');}
   assert.equal(url,'https://api.chat.heyotto.app/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer test-student-secret');assert.ok(!options.body.includes('test-student-secret'));
   const request=JSON.parse(options.body);assert.equal(request.model,'heyotto-code');assert.match(request.messages[0].content,/Selected text/);
   const teaching={summary:'I changed the AI test heading from My website to A brighter idea, keeping the rest of the page unchanged.',changes:[{before:selected,after:'A brighter idea.',explanation:'This replaces the heading text while keeping its structure.',test:'Read the first heading in the preview.',challenge:'Change one word in the heading yourself.'}]};
   return Response.json({choices:[{message:{content:'```jsx\nA brighter idea.\n```\n```json\n'+JSON.stringify(teaching)+'\n```'}}]});
  };
  const result=await f.request(`/projects/${pid}/assist`,{method:'POST',cookie,data:{revision:0,prompt:'Change the first heading.',selection:{from,to}}});
  assert.equal(result.status,200);assert.equal(calls,2);assert.equal(result.data.source,p.source.slice(0,from)+'A brighter idea.'+p.source.slice(to));assert.ok(!JSON.stringify(result.data).includes('secret'));
  assert.equal(result.data.teaching.changes.length,1);assert.ok(!result.data.source.includes('```json'));
  assert.equal((await f.request('/projects/'+pid,{cookie})).data.project.source,p.source,'A suggestion must not save or publish');
 }finally{globalThis.fetch=originalFetch;f.DB.close();}
});
test('the studio CSP stays strict and only the isolated preview permits code evaluation',async()=>{
 const {default:worker}=await import('../dist/server/index.js');
 const app=await worker.fetch(new Request(origin+'/'),{});const policy=app.headers.get('content-security-policy');assert.ok(!policy.includes('unsafe-eval'));assert.ok(!policy.includes("script-src 'self' 'unsafe-inline'"));
 const preview=await worker.fetch(new Request(origin+'/sandbox'),{});const sandbox=preview.headers.get('content-security-policy');assert.match(sandbox,/sandbox allow-scripts/);assert.ok(!sandbox.includes('allow-same-origin'));assert.match(sandbox,/connect-src 'none'/);assert.match(sandbox,/form-action 'none'/);
});
