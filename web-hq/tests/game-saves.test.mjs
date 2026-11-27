import {apiWithApprovedPublishes as api} from './support/approved-publication.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {hashPassword} from '../server/app.mjs';import {localDatabase} from '../scripts/db.mjs';
import {createGameSaves,gameSaveInstructions} from '../src/game-saves.mjs';
import {postgresSql} from '../server/postgres.mjs';

test('private progress is isolated by authenticated player and game, persists across sessions and rejects stale writes',async()=>{
 const DB=localDatabase(),pw=await hashPassword('test-password');
 const call=async(path,cookie,data)=>{const r=await api(new Request('https://test/api'+path,{method:data?'POST':'GET',headers:{origin:'https://test','content-type':'application/json',...(cookie?{cookie}:{})},body:data?JSON.stringify(data):undefined}),{DB});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
  for(const [id,role,cid]of [['a','student','oak'],['b','student','oak'],['visitor','student','pine'],['teacher','teacher',null]])DB.raw.prepare('INSERT INTO users(id,username,name,password,role,class_id,permanent_id,vault_id) VALUES(?,?,?,?,?,?,?,?)').run(id,id,id,pw,role,cid,id,id);
  for(const cid of ['oak','pine'])DB.raw.prepare('INSERT INTO classes(id,name,slug,teacher,created) VALUES(?,?,?,?,1)').run(cid,cid,cid,'teacher');
  const login=async who=>(await call('/login',null,{username:who,password:'test-password'})).cookie;
  const a=await login('a'),b=await login('b'),visitor=await login('visitor');
  const pid=(await call('/projects',a,{classId:'oak',title:'Long game'})).data.id,endpoint='/projects/'+pid+'/game-save';
  assert.equal((await call(endpoint)).status,401);
  assert.equal((await call(endpoint,b)).status,404); // unpublished draft
  assert.deepEqual((await call(endpoint,a)).data,{data:null,revision:0,updated:null});
  const progress={schemaVersion:1,inventory:['seed'],quests:{garden:true},position:{x:3,z:4},coins:20};
  assert.equal((await call(endpoint,a,{data:progress,revision:0,userId:'b'})).status,200);
  assert.equal((await call(endpoint,a,{data:{coins:0},revision:0})).status,409);
  assert.deepEqual((await call(endpoint,await login('a'))).data.data,progress);
  await call(`/projects/${pid}/publish`,a,{revision:0});
  assert.equal((await call(endpoint,b)).data.data,null);
  assert.equal((await call(endpoint,b,{data:{coins:99},revision:0})).status,200);
  assert.equal((await call(endpoint,a)).data.data.coins,20);
  assert.equal((await call(endpoint,visitor)).status,404);
  DB.raw.prepare('UPDATE classes SET shared=1 WHERE id=?').run('oak');
  assert.equal((await call(endpoint,visitor)).status,404); // sharing must be explicit
  DB.raw.prepare('UPDATE projects SET share_external=1 WHERE id=?').run(pid);
  assert.equal((await call(endpoint,visitor,{data:{coins:7},revision:0})).status,200);
  assert.equal((await call(endpoint,a,{data:{coins:21},revision:1})).data.revision,2);
  assert.equal((await call(endpoint,a,{data:{coins:22},revision:1})).status,409);
  assert.equal((await call(endpoint,a,{data:{large:'x'.repeat(131072)},revision:2})).status,413);
  assert.equal((await call(endpoint,a,{data:[],revision:2})).status,400);
  const other=(await call('/projects',a,{classId:'oak',title:'Other game'})).data.id;
  assert.equal((await call('/projects/'+other+'/game-save',a)).data.data,null);
  await call(`/projects/${pid}/address`,a,{slug:'renamed-game'});
  assert.equal((await call(endpoint,a)).data.data.coins,21);
  await call(`/projects/${pid}/trash`,a,{trashed:true});assert.equal((await call(endpoint,a)).status,404);
  await call(`/projects/${pid}/trash`,a,{trashed:false});assert.equal((await call(endpoint,a)).data.data.coins,21);
  await call(`/projects/${pid}/trash`,a,{trashed:true});await call(`/projects/${pid}/delete`,a,{confirmDelete:true});
  assert.equal(DB.raw.prepare('SELECT count(*) AS n FROM game_saves WHERE project_id=?').get(pid).n,0);
 }finally{DB.close();}
});
test('save SDK loads before writing, snapshots data, serialises updates and stops after uncertain or conflicting writes',async()=>{
 const calls=[];let fail=false;
 const saves=createGameSaves(async(action,args)=>{calls.push({action,args});if(fail)throw new Error('Conflict or network failure');return action==='load'?{data:null,revision:0,updated:null}:{revision:args.revision+1,updated:100};});
 await assert.rejects(saves.save({coins:1}),/Load/);assert.equal(calls.length,0);
 await saves.load();const state={coins:2},one=saves.save(state);state.coins=99;
 const two=saves.save({coins:3});assert.equal((await one).revision,1);assert.equal((await two).revision,2);
 assert.equal(calls[1].args.data.coins,2);assert.equal(calls[2].args.revision,1);
 fail=true;await assert.rejects(saves.save({coins:4}),/Conflict/);fail=false;
 await assert.rejects(saves.save({coins:5}),/Load/);
 await saves.load();assert.equal((await saves.save({coins:6})).revision,1);
 assert.match(gameSaveInstructions,/Load ONCE before gameplay/);assert.match(gameSaveInstructions,/do not overwrite/);
 assert.match(postgresSql('SELECT state FROM game_saves WHERE user_id=?'),/studio.game_saves/);
});
