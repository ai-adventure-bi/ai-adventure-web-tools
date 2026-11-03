import test from 'node:test';import assert from 'node:assert/strict';import {server} from '../server.mjs';
test('local server serves editor assets while denying secrets and server source',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const path of ['/','/lab/style.css','/lab/workshop.css','/lab/interface.css','/lab/feedback.css','/lab/ui.js','/lab/files.js','/lab/workshop-panel.js','/lab/print-room.js','/lab/teacher-controller.js','/lab/on-object.js','/lab/codes.mjs','/lab/contact.js','/lab/floating.js','/lab/selection-cut.js','/lab/mesh.js','/vendor/GLTFLoader.js']){const r=await fetch(base+path);assert.equal(r.status,200,path);assert.ok((await r.text()).length>20);}
  for(const path of ['/.env','/lab/auth.mjs','/lab/heyotto.mjs','/lab/003_classrooms.sql','/lab/api.mjs','/lab/002_lab.sql','/server.mjs','/package.json','/lab/topbot-original.html'])assert.equal((await fetch(base+path)).status,404,path);
  const r=await fetch(base+'/api/3d-lab',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'config'})});assert.equal(r.status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
