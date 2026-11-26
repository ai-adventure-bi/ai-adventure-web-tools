import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readEdits,applyEdits,checkCompletion} from '../server/targeted-edits.mjs';
import {validateProposal} from '../server/proposal-validation.mjs';
import {api,hashPassword} from '../server/app.mjs';
import {localDatabase} from '../scripts/db.mjs';

test('targeted edits preserve a large game outside exact, non-overlapping replacements',()=>{
 const prefix=Array.from({length:1800},(_,i)=>`// Existing scenery ${i}\n`).join('');
 const original=prefix+'const DOG_DISTANCE = 0.5;\nconst legSpeed = 0;\nexport default function App(){return <h1>Willowbrook</h1>}';
 const reply=JSON.stringify({summary:'The dog keeps its distance and moves its legs.',edits:[{before:'const DOG_DISTANCE = 0.5;',after:'const DOG_DISTANCE = 1.5;'},{before:'const legSpeed = 0;',after:'const legSpeed = 4;'}]});
 const parsed=readEdits(reply),after=applyEdits(original,parsed.edits);
 assert.equal(after.slice(0,prefix.length),prefix);assert.match(after,/DOG_DISTANCE = 1.5/);assert.match(after,/legSpeed = 4/);
 assert.equal(after.slice(after.indexOf('export default')),original.slice(original.indexOf('export default')));
 validateProposal(after,'jsx');
 assert.throws(()=>applyEdits(original,[{before:original,after:original+'\n// rewrite'}]),/too large/);
});

test('ambiguous, missing, overlapping, out-of-selection and sequential-anchor edits are rejected',()=>{
 assert.throws(()=>applyEdits('same same',[{before:'same',after:'new'}]),/more than one/);
 assert.throws(()=>applyEdits('original',[{before:'missing',after:'new'}]),/does not match/);
 assert.throws(()=>applyEdits('abcdef',[{before:'abcd',after:'x'},{before:'cdef',after:'y'}]),/overlapping/);
 assert.throws(()=>applyEdits('abcdef',[{before:'abc',after:'x'}],{from:2,to:6}),/outside/);
 assert.throws(()=>applyEdits('one',[{before:'one',after:'two'},{before:'two',after:'three'}]),/does not match/);
 assert.throws(()=>applyEdits('one',[{before:'',after:'two'}]),/exact existing/);
 assert.throws(()=>applyEdits('one',[{before:'one',after:'one'}]),/did not propose/);
});

test('truncated provider replies and partial JSON are detected before applying anything',()=>{
 const complete=JSON.stringify({edits:[{before:'old',after:'new'}]});
 assert.throws(()=>checkCompletion({choices:[{finish_reason:'length',message:{content:complete}}]}),/cut short/);
 assert.throws(()=>checkCompletion({choices:[{finish_reason:'MAX_TOKENS',message:{content:complete}}]}),/cut short/);
 assert.throws(()=>readEdits('```json\n{"edits":[{"before":"old","after":"unfin'),/cut short/);
 assert.throws(()=>readEdits('{"edits":[]'),/read completely/);
 assert.equal(checkCompletion({choices:[{finish_reason:'stop',message:{content:complete}}]}),complete);
 assert.equal(readEdits('```json\n'+complete+'\n```').edits.length,1);
});

test('proposal validation parses JSX and HTML scripts without executing student code',()=>{
 delete globalThis.__proposalSideEffect;
 validateProposal('globalThis.__proposalSideEffect=true; export default function App(){return <h1>Safe</h1>}','jsx');
 assert.equal(globalThis.__proposalSideEffect,undefined);
 assert.throws(()=>validateProposal('export default function App(){return <h1>unfinished','jsx'));
 assert.throws(()=>validateProposal('const thing=1;','jsx'),/default export/);
 assert.throws(()=>validateProposal('const fake="exports.default = App; export default";','jsx'),/default export/);
 assert.throws(()=>validateProposal("import nope from 'unavailable-package'; export default function App(){return null}",'jsx'));
 validateProposal('<html><body><canvas></canvas><script>const score=1;</script></body></html>','html');
 assert.throws(()=>validateProposal('<script>function broken(</script>','html'));
 assert.throws(()=>validateProposal('<script>const score=1;','html'),/unfinished/);
 assert.throws(()=>validateProposal('<style>.game { color: red','html'),/unfinished/);
});

test('API reviews targeted edits but rejects invalid, truncated and stale replies without changing drafts or adding history',async()=>{
 const DB=localDatabase(),oldFetch=globalThis.fetch,env={DB,SUPABASE_URL:'https://vault.test',SUPABASE_SECRET_KEY:'sb_secret_fake'};
 const call=async(path,body,cookie)=>{const r=await api(new Request('https://test/api'+path,{method:'POST',headers:{origin:'https://test','content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)}),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
  DB.raw.prepare("INSERT INTO classes(id,name,slug,teacher,created) VALUES('oak','Oak','oak','teacher',1)").run();
  DB.raw.prepare("INSERT INTO users(id,username,name,password,role,class_id,permanent_id,vault_id,key_saved) VALUES('a','a','A',?,'student','oak','a','studio:a',1)").run(await hashPassword('test-password'));
  const cookie=(await call('/login',{username:'a',password:'test-password'})).cookie;
  const pid=(await call('/projects',{classId:'oak',title:'Willowbrook'},cookie)).data.id;
  const original='// scenery\n'.repeat(2000)+'const DOG_DISTANCE = 0.5;\nexport default function App(){return <h1>Willowbrook</h1>}';
  DB.raw.prepare('UPDATE projects SET source=? WHERE id=?').run(original,pid);
  let mode='valid';
  globalThis.fetch=async(url,options)=>{if(url.includes('oracle_read_key'))return Response.json('fake-key');const prompt=JSON.parse(options.body).messages[0].content;assert.match(prompt,/TARGETED EDIT MODE/);assert.match(prompt,/Do not reproduce the whole file/);
   if(mode==='stale')DB.raw.prepare('UPDATE projects SET revision=revision+1 WHERE id=?').run(pid);
   const payload={summary:'Willowbrook now checks DOG_DISTANCE against 1.5 metres, so the dog stays farther from the player. Change DOG_DISTANCE to adjust the gap.',edits:[{before:'const DOG_DISTANCE = 0.5;',after:mode==='invalid'?'const DOG_DISTANCE = ;':'const DOG_DISTANCE = 1.5;',explanation:'DOG_DISTANCE sets the minimum gap between dog and player.',test:'Walk towards the dog.',challenge:'Change DOG_DISTANCE to 2.'}]};
   return Response.json({choices:[{finish_reason:mode==='truncated'?'length':'stop',message:{content:mode==='whole'?'```jsx\n'+original+'\n```':JSON.stringify(payload)}}]});};
  const valid=await call(`/projects/${pid}/assist`,{revision:0,prompt:'Keep the dog at a distance'},cookie);assert.equal(valid.status,200);assert.match(valid.data.source,/DOG_DISTANCE = 1.5/);assert.equal(valid.data.teaching.changes.length,1);
  assert.equal(DB.raw.prepare('SELECT source FROM projects WHERE id=?').get(pid).source,original);
  for(mode of ['invalid','truncated','whole','stale']){const result=await call(`/projects/${pid}/assist`,{revision:0,prompt:'Keep the dog at a distance'},cookie);assert.equal(result.status,mode==='stale'?409:422,JSON.stringify(result.data));if(mode==='truncated')assert.match(result.data.error,/cut short/);}
  assert.equal(DB.raw.prepare('SELECT count(*) AS n FROM versions WHERE project_id=?').get(pid).n,1);
  assert.equal(DB.raw.prepare('SELECT source FROM projects WHERE id=?').get(pid).source,original);
 }finally{globalThis.fetch=oldFetch;DB.close();}
});
