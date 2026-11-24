import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateMedia,MAX_VIDEO_BYTES} from '../server/media.mjs';
import {mediaIds,mediaSnippet} from '../src/media-client.mjs';
import {api,hashPassword} from '../server/app.mjs';
import {localDatabase} from '../scripts/db.mjs';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==';
test('media uploads allow raster images and bounded videos, not active content',()=>{
 assert.equal(validateMedia('photo.png',png).mime,'image/png');
 assert.throws(()=>validateMedia('drawing.svg','data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='),/SVG/);
 assert.throws(()=>validateMedia('pretend.png','data:image/png;base64,PGh0bWw+PC9odG1sPg=='),/contents/);
 const mp4=Buffer.alloc(24);mp4.write('ftyp',4);assert.equal(validateMedia('clip.mp4','data:video/mp4;base64,'+mp4.toString('base64')).bytes,24);
 assert.throws(()=>validateMedia('large.mp4','data:video/mp4;base64,'+Buffer.alloc(MAX_VIDEO_BYTES+1).toString('base64')),/3 MB/);
});
test('media markers and inserted code retain exact references without inventing SVGs',()=>{
 const id='12345678-1234-1234-1234-123456789abc',marker='studio-media:'+id;
 assert.deepEqual(mediaIds(marker+' '+marker),[id]);
 assert.match(mediaSnippet(marker,'My photograph'),/<img src=/);assert.ok(!mediaSnippet(marker,'My photograph').includes('<svg'));
 assert.match(mediaSnippet('https://example.test/clip.mp4','Clip','video'),/controls playsInline/);
 assert.throws(()=>mediaSnippet('javascript:alert(1)','no'),/HTTPS/);
 assert.match(mediaSnippet(marker,'Photo "one"','image','html'),/alt="Photo &quot;one&quot;"/);
 assert.ok(!mediaSnippet(marker,'Photo','image','html').includes('src={'));
});
test('uploaded media stays private until used in a published class page',async()=>{
 const DB=localDatabase(),origin='https://studio.test',pw=await hashPassword('test-password');
 const call=async(path,{data,cookie}={})=>{const response=await api(new Request(origin+'/api'+path,{method:data?'POST':'GET',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:data?JSON.stringify(data):undefined}),{DB});return {status:response.status,data:response.headers.get('content-type')?.startsWith('application/json')?await response.json():null,cookie:response.headers.get('set-cookie')?.split(';')[0]};};
 try{
 for(const cid of ['oak','birch'])DB.raw.prepare('INSERT INTO classes(id,name,slug,teacher,created) VALUES(?,?,?,?,?)').run(cid,cid,cid,'teacher',1);
 for(const [id,cid]of [['a','oak'],['b','oak'],['c','birch']])DB.raw.prepare('INSERT INTO users(id,username,name,password,role,class_id,permanent_id,vault_id) VALUES(?,?,?,?,?,?,?,?)').run(id,id,id,pw,'student',cid,id,'studio:'+id);
 const logins={};for(const id of ['a','b','c'])logins[id]=(await call('/login',{data:{username:id,password:'test-password'}})).cookie;
 const pid=(await call('/projects',{cookie:logins.a,data:{classId:'oak',title:'Photos'}})).data.id;
 const uploaded=await call(`/projects/${pid}/media`,{cookie:logins.a,data:{name:'My photo.png',dataUrl:png}});assert.equal(uploaded.status,200);const {id,src}=uploaded.data;
 assert.equal((await call('/media/'+id,{cookie:logins.b})).status,404);
 assert.equal((await call('/media/'+id,{cookie:logins.c})).status,404);
 assert.equal((await call(`/projects/${pid}/media`,{cookie:logins.b,data:{name:'Other.png',dataUrl:png}})).status,403);
 assert.equal((await call('/media/'+id,{cookie:logins.a})).data.dataUrl,png);
 const p=(await call('/projects/'+pid,{cookie:logins.a})).data.project;
 const saved=await call(`/projects/${pid}/save`,{cookie:logins.a,data:{...p,source:`export default function App(){return <img src="${src}" alt="Photo"/>;}`}});assert.equal(saved.status,200);
 await call(`/projects/${pid}/publish`,{cookie:logins.a,data:{revision:1}});
 assert.equal((await call('/media/'+id,{cookie:logins.b})).status,200);
 assert.equal((await call('/media/'+id+'/file',{cookie:logins.b})).status,200);
 assert.equal((await call('/media/'+id,{cookie:logins.c})).status,404);
 }finally{DB.close();}
});
