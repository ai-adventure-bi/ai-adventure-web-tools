import test from 'node:test';import assert from 'node:assert/strict';
import {api,hashPassword} from '../server/app.mjs';import {localDatabase} from '../scripts/db.mjs';
import {resolveMedia} from '../src/media-client.mjs';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=';
async function fixture(){
 const DB=localDatabase(),pw=await hashPassword('test-password'),cookies={};
 const call=async(path,who,data)=>{const response=await api(new Request('https://test/api'+path,{method:data?'POST':'GET',headers:{origin:'https://test','content-type':'application/json',...(cookies[who]?{cookie:cookies[who]}:{})},body:data?JSON.stringify(data):undefined}),{DB});return {status:response.status,data:response.headers.get('content-type')?.includes('application/json')?await response.json():null,cookie:response.headers.get('set-cookie')?.split(';')[0]};};
 for(const [id,role,cid]of [['a','student','oak'],['b','student','oak'],['visitor','student','pine'],['teacher','teacher',null],['second','teacher',null],['foreign','teacher',null],['admin','admin',null]])DB.raw.prepare('INSERT INTO users(id,username,name,password,role,class_id,permanent_id,vault_id) VALUES(?,?,?,?,?,?,?,?)').run(id,id,id,pw,role,cid,id,id);
 for(const [cid,teacher]of [['oak','teacher'],['pine','foreign']])DB.raw.prepare('INSERT INTO classes(id,name,slug,teacher,shared,created) VALUES(?,?,?,?,1,1)').run(cid,cid,cid,teacher);
 DB.raw.prepare("INSERT INTO class_teachers(class_id,user_id) VALUES('oak','second')").run();
 for(const id of ['a','b','visitor','teacher','second','foreign','admin'])cookies[id]=(await call('/login',null,{username:id,password:'test-password'})).cookie;
 const pid=(await call('/projects','a',{classId:'oak',title:'Student page'})).data.id;
 const save=async(source,title='Student page')=>{const p=(await call('/projects/'+pid,'a')).data.project;return call(`/projects/${pid}/save`,'a',{...p,source,title});};
 const submit=async()=>call(`/projects/${pid}/publish`,'a',{revision:(await call('/projects/'+pid,'a')).data.project.revision});
 const decide=async(rid,who='teacher',extra={})=>{const detail=await call('/reviews/'+rid,who);return call('/reviews/'+rid+'/decision',who,{decision:'approve',confirmReview:true,mediaRevision:detail.data.project.mediaRevision,...extra});};
 return {DB,call,pid,save,submit,decide};
}
test('student publication is queued, scoped to assigned staff and publishes only the submitted snapshot',async()=>{
 const f=await fixture();try{
  const {call,pid}=f;f.DB.raw.prepare('UPDATE projects SET share_external=1 WHERE id=?').run(pid);
  await f.save("export default function App(){return <h1>Submitted one</h1>}");
  const sent=await f.submit();assert.equal(sent.status,202);assert.equal(sent.data.pending,true);const rid=sent.data.reviewId;
  assert.equal((await call('/classes/oak/projects','b')).data.projects.length,0);
  assert.equal((await call('/community/oak','visitor')).data.projects.length,0);
  assert.equal((await call('/published/oak/student-page','b')).status,404);
  assert.equal((await call('/reviews','a')).status,403);
  assert.equal((await call('/reviews/'+rid,'a')).status,403);
  assert.equal((await call('/reviews/'+rid,'foreign')).status,404);
  assert.equal((await call('/reviews','foreign')).data.reviews.length,0);
  assert.equal((await call('/reviews','second')).data.reviews.length,1);
  const detail=(await call('/reviews/'+rid,'teacher')).data;
  assert.equal((await call('/reviews/'+rid+'/decision','a',{decision:'approve',confirmReview:true,mediaRevision:0})).status,403);
  assert.equal((await call('/reviews/'+rid+'/decision','teacher',{decision:'approve',mediaRevision:0})).status,400);
  await f.save("export default function App(){return <h1>Later private draft</h1>}");
  assert.equal((await f.decide(rid,'second')).status,200);
  const published=(await call('/published/oak/student-page','b')).data.site;
  assert.match(published.source,/Submitted one/);assert.ok(!published.source.includes('Later private'));
  assert.equal(published.id,detail.version.id);
  assert.equal((await call('/community/oak','visitor')).data.projects.length,1);
  assert.equal((await f.decide(rid)).status,409);
  const next=await f.submit();assert.equal(next.status,202);
  assert.equal((await call('/published/oak/student-page','b')).data.site.id,published.id);
  assert.equal((await f.decide(next.data.reviewId,'admin',{decision:'changes',note:''})).status,400);
  assert.equal((await f.decide(next.data.reviewId,'admin',{decision:'changes',note:'Remove the private address.'})).status,200);
  assert.equal((await call('/projects/'+pid,'a')).data.review.note,'Remove the private address.');
  assert.equal((await call('/published/oak/student-page','b')).data.site.id,published.id);
  const first=await f.submit(),replacement=await f.submit();
  assert.equal((await f.decide(first.data.reviewId)).status,409);
  assert.equal((await call('/reviews','teacher')).data.reviews[0].id,replacement.data.reviewId);
  await call(`/projects/${pid}/trash`,'a',{trashed:true});
  assert.equal((await call('/reviews','teacher')).data.reviews.length,0);
  await call(`/projects/${pid}/trash`,'a',{trashed:false});
  assert.equal((await call('/projects/'+pid,'a')).data.review.status,'cancelled');
  assert.equal((await f.decide(replacement.data.reviewId)).status,409);
  await call(`/projects/${pid}/trash`,'a',{trashed:true});await call(`/projects/${pid}/delete`,'a',{confirmDelete:true});
  assert.equal(f.DB.raw.prepare('SELECT count(*) AS n FROM publish_reviews WHERE project_id=?').get(pid).n,0);
 }finally{f.DB.close();}
});
test('review shows all uploads, changes invalidate approval, removal clears thumbnails and blanket approval is private until published',async()=>{
 const f=await fixture();try{
  const {call,pid}=f;
  const image=(await call(`/projects/${pid}/media`,'a',{name:'private-photo.png',dataUrl:png})).data;
  const unused=(await call(`/projects/${pid}/media`,'a',{name:'unused-photo.png',dataUrl:png})).data;
  await f.save(`export default function App(){return <img src="${image.src}" alt="Picture"/>}`);
  const sent=await f.submit(),rid=sent.data.reviewId;
  const reviewed=(await call('/reviews/'+rid,'teacher')).data;assert.equal(reviewed.media.length,2);
  assert.equal((await call('/media/'+image.id,'b')).status,404);
  assert.equal((await call('/media/'+image.id,'teacher')).status,200);
  await call(`/projects/${pid}/media`,'a',{name:'added-during-review.png',dataUrl:png});
  assert.equal((await call('/reviews/'+rid+'/decision','teacher',{decision:'approve',confirmReview:true,mediaRevision:reviewed.project.mediaRevision})).status,409);
  assert.equal((await call(`/projects/${pid}/media/${image.id}/remove`,'a',{confirmDelete:true})).status,403);
  assert.equal((await call(`/projects/${pid}/media/${image.id}/remove`,'foreign',{confirmDelete:true})).status,404);
  assert.equal((await call(`/projects/${pid}/media/${image.id}/remove`,'teacher',{})).status,400);
  f.DB.raw.prepare("UPDATE versions SET thumbnail='sensitive-old-thumbnail' WHERE project_id=?").run(pid);
  const beforeRemoval=(await call('/reviews/'+rid,'teacher')).data;
  assert.equal((await call(`/projects/${pid}/media/${image.id}/remove`,'teacher',{confirmDelete:true})).status,200);
  assert.equal((await call('/media/'+image.id,'a')).status,404);
  assert.equal(f.DB.raw.prepare("SELECT count(*) AS n FROM versions WHERE project_id=? AND thumbnail<>''").get(pid).n,0);
  assert.equal((await call('/reviews/'+rid+'/decision','teacher',{decision:'approve',confirmReview:true,mediaRevision:beforeRemoval.project.mediaRevision})).status,409);
  assert.equal((await f.decide(rid)).status,200);
  assert.equal(f.DB.raw.prepare('SELECT count(*) AS n FROM media WHERE project_id=? AND approved=0').get(pid).n,0);
  assert.equal((await call('/media/'+unused.id,'b')).status,404); // unused files stay private
  assert.match((await call('/published/oak/student-page','b')).data.site.source,new RegExp(image.id)); // code reference retained
  const fresh=(await call(`/projects/${pid}/media`,'a',{name:'new-private.png',dataUrl:png})).data;
  assert.equal(f.DB.raw.prepare('SELECT approved FROM media WHERE id=?').get(fresh.id).approved,0);
  assert.equal((await call('/media/'+fresh.id,'b')).status,404);
 }finally{f.DB.close();}
});
test('missing uploaded images use an invalid image source so the browser displays its native broken-image indicator',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>new Response('{}',{status:404});
 try{const marker='studio-media:00000000-0000-0000-0000-000000000000';assert.equal((await resolveMedia(marker,{tolerant:true}))[marker],'data:image/png;base64,');}finally{globalThis.fetch=previous;}
});
