import {apiWithApprovedPublishes as api} from './support/approved-publication.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword} from '../server/app.mjs';
import {localDatabase} from '../scripts/db.mjs';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

test('student login migration preserves account and Vault identity, including swapped old usernames',()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec("CREATE TABLE users(id TEXT,username TEXT UNIQUE,permanent_id TEXT,role TEXT,vault_id TEXT); INSERT INTO users VALUES('a','second','FIRST','student','vault-a'),('b','first','SECOND','student','vault-b'),('t','teacher','staff-id','teacher','vault-t');");
  db.exec(fs.readFileSync(new URL('../drizzle/0008_student_login.sql',import.meta.url),'utf8'));
  assert.deepEqual(db.prepare('SELECT username FROM users ORDER BY id').all().map(r=>r.username),['first','second','teacher']);
  assert.equal(db.prepare("SELECT vault_id FROM users WHERE id='a'").get().vault_id,'vault-a');
 }finally{db.close();}
});

test('students change only their display name and own password; staff accept short passwords',async()=>{
 const f=await fixture();try{
  const p=await f.login('pupil'),a=await f.login('admin');
  assert.equal((await f.request('/users/pupil',p,{name:'My chosen name'})).status,200);
  assert.equal((await f.request('/me',p)).body.user.name,'My chosen name');
  for(const body of [{username:'different'},{permanentId:'different'},{role:'admin'},{disabled:true},{classId:'pine'}])assert.equal((await f.request('/users/pupil',p,body)).status,403);
  assert.equal((await f.request('/users/visitor',p,{name:'No'})).status,403);
  assert.equal((await f.request('/users/pupil/key',p,{key:'not-allowed'})).status,403);
  assert.equal((await f.request('/users/pupil/password',p,{password:'new-password',currentPassword:'wrong'})).status,403);
  assert.equal((await f.request('/users/pupil/password',p,{password:'new-password',currentPassword:'testing-password'})).status,200);
  assert.equal((await f.request('/me',p)).status,401);
  const created=await f.request('/classes/oak/students',a,{name:'New pupil',permanentId:'OAK-042',password:'student-password'});
  assert.equal(created.status,200);
  const login=await f.request('/login',null,{username:'OAK-042',password:'student-password'});assert.equal(login.status,200);
  assert.equal(login.body.user.username,'OAK-042');
  const row=f.DB.raw.prepare('SELECT * FROM users WHERE id=?').get(created.body.id);assert.equal(row.username,'oak-042');assert.equal(row.permanent_id,'OAK-042');
  assert.equal((await f.request('/staff',a,{name:'Short password teacher',username:'newteacher',password:'x',role:'teacher'})).status,200);
  assert.equal((await f.request('/login',null,{username:'newteacher',password:'x'})).status,200);
  assert.equal((await f.request('/users/admin/password',a,{password:'y',currentPassword:'testing-password'})).status,200);
  assert.equal((await f.request('/me',a)).status,401);
  assert.equal((await f.request('/login',null,{username:'admin',password:'y'})).status,200);
 }finally{f.DB.close();}
});

async function fixture(){
 const DB=localDatabase(),pw=await hashPassword('testing-password');
 for(const [id,role,cid]of [['admin','admin',null],['teacher','teacher',null],['foreign','teacher',null],['pupil','student','oak'],['visitor','student','pine']])DB.raw.prepare('INSERT INTO users(id,username,name,password,role,class_id,permanent_id,vault_id) VALUES(?,?,?,?,?,?,?,?)').run(id,id,id,pw,role,cid,'permanent:'+id,'vault:'+id);
 for(const [id,teacher]of [['oak','teacher'],['pine','foreign']])DB.raw.prepare('INSERT INTO classes(id,name,slug,teacher,created) VALUES(?,?,?,?,?)').run(id,id,id,teacher,1);
 const request=async(path,cookie,body)=>{const res=await api(new Request('https://test/api'+path,{method:body?'POST':'GET',headers:{origin:'https://test','content-type':'application/json',...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined}),{DB});return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};};
 const login=async name=>(await request('/login',null,{username:name,password:'testing-password'})).cookie;
 return {DB,request,login};
}

test('published gallery thumbnails persist with their snapshot and reject active content',async()=>{
 const f=await fixture();try{
  const cookie=await f.login('pupil');const id=(await f.request('/projects',cookie,{classId:'oak',title:'Thumbnail example'})).body.id;
  const thumbnail='data:image/jpeg;base64,/9j/2Q==';
  assert.equal((await f.request(`/projects/${id}/publish`,cookie,{revision:0,thumbnail:'data:image/svg+xml,<svg/>'})).status,400);
  assert.equal((await f.request(`/projects/${id}/publish`,cookie,{revision:0,thumbnail})).status,200);
  assert.equal((await f.request('/classes/oak/projects',cookie)).body.projects[0].has_thumbnail,1);
  const published=f.DB.raw.prepare('SELECT published_id FROM projects WHERE id=?').get(id);const image=await api(new Request(`https://test/api/thumbnails/${id}/${published.published_id}`,{headers:{cookie}}),{DB:f.DB});assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/jpeg');
  const project=(await f.request('/projects/'+id,cookie)).body.project;
  await f.request(`/projects/${id}/save`,cookie,{...project,title:'Private draft'});
  const gallery=(await f.request('/classes/oak/projects',cookie)).body.projects[0];assert.equal(gallery.title,'Thumbnail example');assert.equal(gallery.has_thumbnail,1);assert.equal(gallery.thumbnail,undefined);
 }finally{f.DB.close();}
});
test('multiple classroom teachers share management; unchecking revokes access without changing students',async()=>{
 const f=await fixture();try{
 const a=await f.login('admin'),t=await f.login('teacher'),other=await f.login('foreign');
 assert.equal((await f.request('/classes/oak/roster',other)).status,404);
 assert.equal((await f.request('/classes/oak',a,{name:'Oak',teacherIds:['teacher','foreign','teacher']})).status,200);
 assert.deepEqual(new Set((await f.request('/me',other)).body.classes.map(c=>c.id)),new Set(['oak','pine']));
 assert.equal((await f.request('/classes/oak/roster',other)).status,200);
 assert.equal((await f.request('/users/pupil',other,{name:'Updated by co-teacher'})).status,200);
 assert.equal((await f.request('/classes/oak',other,{name:'Oak',teacherIds:['foreign']})).status,403);
 assert.equal((await f.request('/classes/oak',a,{name:'Oak',teacherIds:[]})).status,400);
 assert.equal((await f.request('/classes/oak',a,{name:'Oak',teacherIds:['pupil']})).status,400);
 assert.equal((await f.request('/classes/oak',a,{name:'Oak',teacherIds:['foreign']})).status,200);
 assert.equal((await f.request('/classes/oak/roster',t)).status,404);
 assert.equal((await f.request('/users/pupil',t,{name:'No access'})).status,404);
 assert.equal((await f.request('/classes/oak/roster',other)).status,200);
 assert.equal(f.DB.raw.prepare('SELECT class_id FROM users WHERE id=?').get('pupil').class_id,'oak');
 const created=await f.request('/classes',a,{name:'Shared class',teacherIds:['teacher','foreign']});assert.equal(created.status,200);
 assert.equal((await f.request(`/classes/${created.body.id}/roster`,t)).status,200);
 assert.equal((await f.request(`/classes/${created.body.id}/roster`,other)).status,200);
 assert.equal((await f.request('/classes',t,{name:'Escalate',teacherIds:['teacher','foreign']})).status,403);
 }finally{f.DB.close();}
});
test('admin creates staff, teachers stay scoped, and renaming preserves identity',async()=>{
 const f=await fixture();try{
 const a=await f.login('admin'),t=await f.login('teacher'),v=await f.login('visitor');
 assert.equal((await f.request('/staff',t)).status,403);
 assert.equal((await f.request('/staff',a,{name:'New admin',username:'newadmin',password:'testing-password',role:'admin'})).status,200);
 assert.equal((await f.request('/users/foreign',t,{username:'stolen'})).status,403);
 assert.equal((await f.request('/users/visitor',t,{username:'stolen'})).status,404);
 assert.equal((await f.request('/users/teacher',t,{role:'admin'})).status,403);
 assert.equal((await f.request('/users/pupil',t,{username:'renamed-pupil',name:'New name'})).status,403);
 assert.equal((await f.request('/users/pupil',t,{name:'New name'})).status,200);
 const p=f.DB.raw.prepare('SELECT * FROM users WHERE id=?').get('pupil');assert.equal(p.permanent_id,'permanent:pupil');assert.equal(p.vault_id,'vault:pupil');assert.equal(p.username,'pupil');
 assert.equal((await f.request('/users/teacher',a,{username:'renamedteacher'})).status,200);
 assert.equal((await f.request('/users/pupil',v,{username:'nope'})).status,403);
 assert.deepEqual((await f.request('/me',t)).body.classes.map(c=>c.id),['oak']);
 assert.equal((await f.request('/users/admin/disabled',a,{disabled:true})).status,400);
 }finally{f.DB.close();}
});
test('last admin is protected, and admin promotion/demotion changes access immediately',async()=>{
 const f=await fixture();try{
 const a=await f.login('admin'),t=await f.login('teacher');
 assert.equal((await f.request('/users/admin',a,{role:'teacher'})).status,409);
 assert.equal((await f.request('/users/teacher',a,{role:'admin'})).status,200);
 assert.equal((await f.request('/me',t)).status,401);
 const promoted=await f.login('teacher');assert.equal((await f.request('/me',promoted)).body.classes.length,2);
 assert.equal((await f.request('/users/admin',promoted,{role:'teacher'})).status,200);
 assert.equal((await f.request('/me',a)).status,401);
 }finally{f.DB.close();}
});
test('school community shares published snapshots but no drafts, roster or unused media',async()=>{
 const f=await fixture();try{
 const a=await f.login('admin'),t=await f.login('teacher'),p=await f.login('pupil'),v=await f.login('visitor');
 assert.equal((await f.request('/classes/oak',a,{name:'Oak School',teacherId:'teacher'})).status,200);
 assert.equal((await f.request('/classes/oak',t,{name:'Hijack',teacherId:'foreign'})).status,403);
 const pid=(await f.request('/projects',p,{classId:'oak',title:'Original'})).body.id;
 let project=(await f.request('/projects/'+pid,p)).body.project;
 assert.equal((await f.request('/classes/oak/projects',a)).body.projects.length,0);
 assert.equal((await f.request('/users/pupil/projects',a)).body.projects.length,1);
 assert.equal((await f.request('/projects/'+pid,t)).status,200);
 assert.equal((await f.request('/projects/'+pid,v)).status,404);
 await f.request(`/projects/${pid}/publish`,p,{revision:0});
 await f.request(`/projects/${pid}/save`,p,{...project,title:'PRIVATE DRAFT'});
 assert.equal((await f.request('/community/oak',v)).status,404);
 await f.request('/classes/oak',t,{name:'Oak School',shared:true});
 assert.equal((await f.request('/community/oak',v)).body.projects.length,0);
 assert.equal((await f.request('/community',v)).body.schools[0].count,0);
 assert.equal((await f.request(`/published/oak/${project.slug}`,v)).status,404);
 assert.equal((await f.request(`/published/oak/${project.slug}`,p)).status,200);
 assert.equal((await f.request('/classes/oak/sharing',p)).status,403);
 assert.equal((await f.request('/classes/oak/sharing',v,{projectIds:[pid]})).status,403);
 const foreign=await f.login('foreign');
 assert.equal((await f.request('/classes/oak/sharing',foreign,{projectIds:[pid]})).status,404);
 assert.equal((await f.request('/classes/oak/sharing',t,{projectIds:['foreign-site']})).status,400);
 assert.equal((await f.request('/classes/oak/sharing',t,{projectIds:[pid]})).status,200);
 assert.equal((await f.request('/community',v)).body.schools[0].id,'oak');
 assert.equal((await f.request('/community',p)).body.schools.some(s=>s.id==='oak'),false);
 assert.equal((await f.request('/classes/pine',t,{name:'Not mine',shared:true})).status,404);
 const community=await f.request('/community/oak',v);assert.equal(community.status,200);assert.equal(community.body.projects[0].title,'Original');assert.ok(!JSON.stringify(community.body).includes('PRIVATE'));
 assert.equal((await f.request(`/published/oak/${project.slug}`,v)).status,200);
 assert.equal((await f.request('/classes/oak/roster',v)).status,404);
 assert.equal((await f.request('/projects/'+pid,v)).status,404);
 f.DB.raw.prepare('INSERT INTO media(id,project_id,name,mime,size,data_url,created) VALUES(?,?,?,?,?,?,?)').run('unused',pid,'unused.png','image/png',3,'data:image/png;base64,AAAA',1);
 assert.equal((await f.request('/media/unused',v)).status,404);
 f.DB.raw.prepare('INSERT INTO media(id,project_id,name,mime,size,data_url,created) VALUES(?,?,?,?,?,?,?)').run('used',pid,'used.png','image/png',3,'data:image/png;base64,AAAA',1);
 f.DB.raw.prepare("UPDATE versions SET source=source||' studio-media:used' WHERE id=(SELECT published_id FROM projects WHERE id=?)").run(pid);
 assert.equal((await f.request('/media/used',v)).status,200);
 f.DB.raw.prepare('UPDATE versions SET thumbnail=? WHERE id=(SELECT published_id FROM projects WHERE id=?)').run('data:image/jpeg;base64,AAAA',pid);
 const version=f.DB.raw.prepare('SELECT published_id FROM projects WHERE id=?').get(pid).published_id;
 const thumbnail=await api(new Request(`https://studio.test/api/thumbnails/${pid}/${version}`,{headers:{cookie:v}}),{DB:f.DB});assert.equal(thumbnail.status,200);
 await f.request(`/projects/${pid}/address`,p,{slug:'renamed-site'});
 assert.equal((await f.request('/resolve-link?href=/c/oak/'+project.slug,v)).status,200);
 await f.request('/classes/oak/sharing',t,{projectIds:[]});
 assert.equal((await f.request('/media/used',v)).status,404);
 assert.equal((await f.request('/community/oak',v)).body.projects.length,0);
 assert.equal((await f.request('/community',v)).body.schools[0].count,0);
 assert.equal((await f.request('/resolve-link?href=/c/oak/'+project.slug,v)).status,404);
 assert.equal((await f.request('/published/oak/renamed-site',v)).status,404);
 assert.equal((await f.request('/link-map',v)).body.links['/c/oak/'+project.slug],undefined);
 const blocked=await api(new Request(`https://studio.test/api/thumbnails/${pid}/${version}`,{headers:{cookie:v}}),{DB:f.DB});assert.equal(blocked.status,404);
 assert.equal((await f.request('/classes/oak/projects',p)).body.projects.length,1);
 await f.request('/classes/oak/sharing',a,{projectIds:[pid]});
 await f.request('/classes/oak',t,{name:'Oak School',shared:false});
 assert.equal((await f.request(`/published/oak/${project.slug}`,v)).status,404);
 await f.request('/classes/oak',t,{shared:true});
 assert.equal((await f.request('/published/oak/renamed-site',v)).status,200);
 await f.request(`/projects/${pid}/trash`,p,{trashed:true});
 assert.equal(f.DB.raw.prepare('SELECT share_external FROM projects WHERE id=?').get(pid).share_external,0);
 }finally{f.DB.close();}
});
