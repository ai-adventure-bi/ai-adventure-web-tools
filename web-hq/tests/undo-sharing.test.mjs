import test from 'node:test';import assert from 'node:assert/strict';
import {createSiteHistory} from '../src/site-history.mjs';
import {api,hashPassword} from '../server/app.mjs';import {localDatabase} from '../scripts/db.mjs';
test('site undo/redo groups typing, restores whole edits and keeps CSS/type changes across file switches',()=>{
 const h=createSiteHistory(),initial={source:'original',css:'',kind:'jsx',title:'My site',description:''};h.reset(initial);
 h.record({...initial,source:'first letter'},{group:'source',time:100});h.record({...initial,source:'typed sentence'},{group:'source',time:200});
 assert.deepEqual(h.undo(),initial);assert.equal(h.redo().source,'typed sentence');
 const proposed={...initial,source:'new game',css:'body{color:red}',kind:'html'};h.record(proposed);
 assert.equal(h.undo().source,'typed sentence');assert.deepEqual(h.redo(),proposed);
 h.record({...proposed,css:'body{color:blue}'});assert.equal(h.undo().css,'body{color:red}');
 assert.equal(h.undo().source,'typed sentence');assert.equal(h.redo().source,'new game');
 h.record({...proposed,title:'Renamed'});assert.equal(h.flags().canRedo,false);assert.equal(h.undo().title,'My site');
 h.reset(initial);assert.deepEqual(h.flags(),{canUndo:false,canRedo:false});
});
test('site history is bounded and a new edit after undo starts its own typing group',()=>{
 const h=createSiteHistory(3),start={source:'0'};h.reset(start);
 for(let i=1;i<8;i++)h.record({source:String(i)});
 assert.equal(h.undo().source,'6');assert.equal(h.undo().source,'5');assert.equal(h.undo().source,'4');assert.equal(h.undo(),null);
 h.reset(start);h.record({source:'a'},{group:'source',time:10});h.record({source:'ab'},{group:'source',time:20});h.undo();h.record({source:'c'},{group:'source',time:30});assert.equal(h.flags().canRedo,false);assert.equal(h.undo().source,'0');
});
test('students opt their own websites in/out only when school sharing is enabled; teacher controls and approval still apply',async()=>{
 const DB=localDatabase(),pw=await hashPassword('test-password'),cookies={};
 const call=async(path,who,data)=>{const response=await api(new Request('https://test/api'+path,{method:data?'POST':'GET',headers:{origin:'https://test','content-type':'application/json',...(cookies[who]?{cookie:cookies[who]}:{})},body:data?JSON.stringify(data):undefined}),{DB});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};};
 try{
  for(const [id,role,cid]of [['a','student','oak'],['b','student','oak'],['visitor','student','pine'],['teacher','teacher',null]])DB.raw.prepare('INSERT INTO users(id,username,name,password,role,class_id,permanent_id,vault_id) VALUES(?,?,?,?,?,?,?,?)').run(id,id,id,pw,role,cid,id,id);
  for(const cid of ['oak','pine'])DB.raw.prepare('INSERT INTO classes(id,name,slug,teacher,created) VALUES(?,?,?,?,1)').run(cid,cid,cid,'teacher');
  for(const who of ['a','b','visitor','teacher'])cookies[who]=(await call('/login',null,{username:who,password:'test-password'})).cookie;
  const pid=(await call('/projects','a',{title:'Shared game',classId:'oak'})).data.id;
  assert.equal((await call(`/projects/${pid}/sharing`,'a',{shared:true})).status,403);
  await call('/classes/oak','teacher',{shared:true});
  assert.equal((await call(`/projects/${pid}/sharing`,'b',{shared:true})).status,403);
  assert.equal((await call(`/projects/${pid}/sharing`,'visitor',{shared:true})).status,404);
  assert.equal((await call(`/projects/${pid}/sharing`,'a',{shared:'yes'})).status,400);
  assert.equal((await call(`/projects/${pid}/sharing`,'a',{shared:true})).status,200);
  assert.equal((await call('/classes/oak/sharing','teacher')).data.projects[0].share_external,1);
  const sent=await call(`/projects/${pid}/publish`,'a',{revision:0});assert.equal(sent.status,202);
  assert.equal((await call('/community/oak','visitor')).data.projects.length,0);
  const review=(await call('/reviews/'+sent.data.reviewId,'teacher')).data;
  await call('/reviews/'+sent.data.reviewId+'/decision','teacher',{decision:'approve',confirmReview:true,mediaRevision:review.project.mediaRevision});
  assert.equal((await call('/community/oak','visitor')).data.projects.length,1);
  assert.equal((await call('/classes/oak/projects','a')).data.projects[0].share_external,1);
  await call(`/projects/${pid}/sharing`,'a',{shared:false});assert.equal((await call('/community/oak','visitor')).data.projects.length,0);
  await call('/classes/oak/sharing','teacher',{projectIds:[pid]});assert.equal((await call('/classes/oak/projects','a')).data.projects[0].share_external,1);
  await call('/classes/oak','teacher',{shared:false});assert.equal((await call('/published/oak/shared-game','visitor')).status,404);
  assert.equal((await call(`/projects/${pid}/sharing`,'a',{shared:true})).status,403);
 }finally{DB.close();}
});
