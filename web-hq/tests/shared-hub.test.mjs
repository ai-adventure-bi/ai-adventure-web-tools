import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createHandler} from '../api/index.mjs';
import {localDatabase} from '../scripts/db.mjs';
import {hashPassword} from '../server/app.mjs';
import {baseFromModuleUrl} from '../src/base-path.mjs';

test('shared hub mount keeps assets, sandbox, cookies, queries and API under /web-hq',async()=>{
 const DB=localDatabase();try{
  DB.raw.prepare("INSERT INTO users(id,username,name,password,role,permanent_id,vault_id) VALUES('admin','teacher','Teacher',?,'admin','staff-id','vault-id')").run(await hashPassword('testing-password'));
  for(const id of ['oak','pine'])DB.raw.prepare('INSERT INTO classes(id,name,slug,teacher,shared,created) VALUES(?,?,?,?,1,1)').run(id,id,id,'admin');
  const handler=createHandler({basePath:'/web-hq',environment:()=>({}),database:()=>DB});
  async function invoke(route,{body,cookie,query=''}={}){const req=Readable.from([]);req.method=body?'POST':'GET';req.url='/api/web-hq?route='+encodeURIComponent(route)+query;req.query={route};req.headers={host:'tools.example',origin:'https://tools.example','content-type':'application/json',...(cookie?{cookie}:{})};if(body)req.body=body;let status,headers,data;await handler(req,{writeHead(s,h){status=s;headers=h;},end(b){data=Buffer.from(b||'').toString();}});return {status,headers,data};}
  const home=await invoke('studio/example');assert.equal(home.status,200);assert.match(home.data,/src="\/web-hq\/assets\/app-/);assert.match(home.data,/href="\/web-hq\/assets\/app-/);
  const script=home.data.match(/src="([^"]+)"/)[1];assert.equal((await invoke(script.slice('/web-hq/'.length))).status,200);
  const sandbox=await invoke('sandbox');assert.match(sandbox.headers['content-security-policy'],/https:\/\/tools.example\/web-hq\/assets\/runtime.js/);assert.match(sandbox.data,/src="\/web-hq\/assets\/sandbox.js"/);
  const login=await invoke('api/login',{body:{username:'teacher',password:'testing-password'}});assert.equal(login.status,200);assert.match(login.headers['set-cookie'],/Path=\/web-hq;/);const cookie=login.headers['set-cookie'].split(';')[0];
  const community=await invoke('api/community',{cookie,query:'&exclude=oak'});assert.equal(community.status,200);assert.deepEqual(JSON.parse(community.data).schools.map(c=>c.id),['pine']);
  const logout=await invoke('api/logout',{cookie,body:{}});assert.match(logout.headers['set-cookie'],/Path=\/web-hq;/);
  assert.equal(baseFromModuleUrl('https://tools.example/web-hq/assets/app-123.js'),'/web-hq');assert.equal(baseFromModuleUrl('http://localhost:4185/assets/chunk-123.js'),'');
 }finally{DB.close();}
});
