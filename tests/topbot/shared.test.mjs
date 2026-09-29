import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {createMockDatabase} from './mock-supabase.mjs';
import {DEFAULT} from '../../topbot/js/recipe-validation.js';
import {issueSession,requireAdmin} from '../../server/session.mjs';

const db=createMockDatabase();
db.server.listen(0,'127.0.0.1'); await once(db.server,'listening');
const appPort=process.env.TEST_PORT||'4191';
const env={...process.env,TOPBOT_ADMIN_CODE:'test-admin-code',TOPBOT_SESSION_SECRET:'test-session-secret-with-at-least-32-characters',SUPABASE_URL:`http://127.0.0.1:${db.server.address().port}`,SUPABASE_SECRET_KEY:'test-database-key',PORT:appPort};
const child=spawn(process.execPath,['--preserve-symlinks','--preserve-symlinks-main','topbot/server.mjs'],{env,stdio:['ignore','pipe','pipe']});
let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
const base=`http://127.0.0.1:${appPort}`;
let token;
async function request(action,data={},auth=true) {
 const response=await fetch(base+'/api/topbot-data',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({action,...data})});
 return {status:response.status,...await response.json()};
}
try {
 await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error(stderr);})]);
 assert.equal((await request('listSchools',{},false)).status,401);
 for(const action of ['listTops','createSchool','setSchoolActive','updateTop','adminTop']) assert.equal((await request(action,{},false)).status,401);
 let login=await fetch(base+'/api/topbot-admin-login',{method:'POST',body:JSON.stringify({code:'bad'})});
 assert.equal(login.status,401);assert.equal((await login.json()).error,'Incorrect admin code.');
 login=await fetch(base+'/api/topbot-admin-login',{method:'POST',body:JSON.stringify({code:env.TOPBOT_ADMIN_CODE})});
 const session=await login.json();assert.equal(session.ok,true); token=session.token;
 assert.deepEqual((await request('listSchools')).result,[]);
 const school=(await request('createSchool',{schoolName:'Test School',expectedStudents:20})).result;
 assert.match(school.classCode,/^\d{4}$/);
 const payload={classCode:school.classCode,studentName:'Student',filament:'pastel',recipe:DEFAULT,submissionId:randomUUID()};
 const saved=await request('submitTop',payload,false);assert.equal(saved.status,200);
 assert.equal((await request('submitTop',payload,false)).result.topCode,saved.result.topCode);assert.equal(db.tops.length,1);
 const topCode=saved.result.topCode;
 const loaded=(await request('loadTop',{topCode},false)).result;
 assert(loaded.recipe);assert.equal(loaded.studentName,undefined);
 assert.equal((await request('listTops')).result[0].recipe,undefined);
 assert.equal((await request('adminTop',{topCode})).result.studentName,'Student');
 assert.equal((await request('setSchoolActive',{classCode:school.classCode,active:false})).result.active,false);
 assert.equal((await request('submitTop',{...payload,submissionId:randomUUID()},false)).status,409);
 assert.equal((await request('listTops')).result.length,1);
 assert.equal((await request('setSchoolActive',{classCode:school.classCode,active:true})).result.classCode,school.classCode);
 assert.equal((await request('updateTop',{topCode,printStatus:'printed'})).result.printStatus,'printed');
 assert.equal((await request('updateTop',{topCode,trashed:true})).result.trashed,true);
 assert.equal((await request('loadTop',{topCode},false)).status,404);
 assert.equal((await request('updateTop',{topCode,trashed:false})).result.printStatus,'printed');
 assert.equal((await request('setSchoolActive',{classCode:'1000&active=eq.true',active:true})).status,400);
 assert.equal((await request('submitTop',{...payload,recipe:{toyType:'invalid'}},false)).status,400);
 const validToken=token;token=token.slice(0,-4)+'xxxx';assert.equal((await request('listSchools')).status,401);token=validToken;
 db.setLimited(true);assert.equal((await request('loadTop',{topCode},false)).status,429);db.setLimited(false);
 assert.equal((await fetch(base+'/server.mjs')).status,404);
 assert.equal((await fetch(base+'/.env')).status,404);
 assert.equal((await fetch(base+'/')).status,200);
 assert.equal((await fetch(base+'/api/design',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
 // Server-side expiry and key rotation invalidate even a copied token.
 Object.assign(process.env,{TOPBOT_ADMIN_CODE:env.TOPBOT_ADMIN_CODE,TOPBOT_SESSION_SECRET:env.TOPBOT_SESSION_SECRET});
 const now=Date.now;Date.now=()=>now()-13*60*60*1000;const expired=issueSession().token;Date.now=now;
 assert.throws(()=>requireAdmin({headers:{authorization:`Bearer ${expired}`}}),/again/);
 process.env.TOPBOT_ADMIN_CODE='rotated';assert.throws(()=>requireAdmin({headers:{authorization:`Bearer ${token}`}}),/again/);
 console.log('PASS: real local HTTP server + mocked Supabase REST: authorization, signed sessions, expiry/rotation, blank start, school add/archive/restore, archive save rejection, retry idempotency, status, Trash, public privacy, rate limits, static serving and HeyOtto route.');
 if(process.env.TOPBOT_BROWSER_TEST_MODULE) {
   const {runBrowserTests}=await import(process.env.TOPBOT_BROWSER_TEST_MODULE);
   await runBrowserTests(base,env.TOPBOT_ADMIN_CODE);
 }
} finally { child.kill();db.server.close(); }
