import {randomInt,randomUUID,createHash} from 'node:crypto';
import {normaliseCode,shortCode} from './codes.mjs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {readStoredProject} from './files.js';
import {database,rateLimit} from '../../server/database.mjs';
import {requireLabAccess,signInLab,teacherCredential} from './auth.mjs';
import {unpackObjects} from './mesh.js';import {sceneConnectivity} from './contact.js';import * as THREE from '../vendor/three.module.js';import {STLExporter} from '../vendor/STLExporter.js';
import {readBody,json,fail,HttpError} from '../../server/http.mjs';
import {tripoRequest,studentView,canReadModel} from './policy.mjs';
import {generateOttoImage,downloadOttoImage,imageType} from './heyotto.mjs';
const bad=(status,message)=>{throw new HttpError(status,message);};
const code=value=>{try{return normaliseCode(value);}catch(e){bad(400,e.message);}};
const patch=(id,body,filter='')=>database(`lab_students?code=eq.${id}${filter}`,{method:'PATCH',body:{...body,updated_at:new Date().toISOString()},headers:{Prefer:'return=representation'}});
const modelTransfers=new Map();
function readProject(input){
 if(input.packed){try{input.project=JSON.parse(gunzipSync(Buffer.from(input.packed,'base64'),{maxOutputLength:40*1024*1024}).toString());}catch{bad(400,'Could not read this project. Your saved version has not changed.');}}
 let meshes;try{meshes=unpackObjects(input.project);}catch(e){bad(400,e.message);}
 if(!meshes.length)bad(400,'The project is empty.');return meshes;
}
function disposeMeshes(meshes){for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();}}
function printMesh(meshes){
 try{if(!sceneConnectivity(meshes).connected)bad(409,'Floating parts found. Attach or remove detached sections before sending to print.');const group=new THREE.Group();for(const mesh of meshes){mesh.visible=true;group.add(mesh);}group.updateMatrixWorld(true);const result=new STLExporter().parse(group,{binary:true});return Buffer.from(result.buffer,result.byteOffset,result.byteLength);}finally{disposeMeshes(meshes);}
}
async function row(id){const key=code(id);let rows=await database(`lab_students?code=eq.${key}`);if(!rows.length&&key.length===6)rows=await database(`lab_students?code=like.*${key}&limit=2`);if(rows.length>1)bad(409,'Two older projects share that short code. Use the original full code for this project.');return rows[0]||bad(404,'Project not found.');}
function storageConfig(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)bad(503,'Connect Supabase before saving projects.');
 return {url:new URL(url).origin,headers:{apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${key}`})}};
}
async function store(path,body,type){
 const {url,headers}=storageConfig();
 for(let attempt=0;attempt<2;attempt++){
  try{const r=await fetch(`${url}/storage/v1/object/3d-lab/${path}`,{method:'POST',headers:{...headers,'content-type':type,'x-upsert':'false'},body,signal:AbortSignal.timeout(60000)});
   if(r.ok)return path;
   // Every path is unique to this immutable upload. A duplicate on retry means
   // the first upload completed after its response was interrupted.
   const detail=await r.json().catch(()=>null);if(attempt&&(r.status===409||Number(detail?.statusCode)===409||detail?.error==='Duplicate'))return path;
   if(r.status<500&&r.status!==408&&r.status!==429)break;
  }catch{/* Retry only this same immutable storage upload, never a paid job. */}
 }
 bad(503,'The file upload could not finish. Your previous saved version is unchanged. Keep this tab open and try Save or Send again. You can also save a copy to this device.');
}
const storeProject=(id,project)=>store(`${id}/${randomUUID()}.json.gz`,gzipSync(JSON.stringify(project)),'application/gzip');
const storeSTL=(id,bytes)=>store(`${id}/${randomUUID()}.stl.gz`,gzipSync(bytes),'application/gzip');
async function signed(path){
 if(!path)bad(404,'There is no saved file yet.');
 const {url,headers}=storageConfig();
 const r=await fetch(`${url}/storage/v1/object/sign/3d-lab/${path}`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({expiresIn:60}),signal:AbortSignal.timeout(15000)});
 const data=await r.json();if(!r.ok||!data.signedURL)bad(503,'Could not open the saved file.');return `${url}/storage/v1${data.signedURL}`;
}
export function tripoFailure(status,data){
 const providerCode=Number.isSafeInteger(data?.code)?`; provider code ${data.code}`:'';
 const hint=data?.code===2010?'There are not enough Tripo API credits to start this model. Check the credit balance in your Tripo developer account.':status===401?'Tripo rejected the API key.':status===403?'Tripo denied access to this operation.':status===402?'Check your Tripo credit balance.':status===429?'Tripo is limiting requests.':status===400?'Tripo rejected the request parameters.':status===404?'Tripo could not find the requested endpoint or job.':'Tripo could not complete the request.';
 return `${hint} (HTTP ${status}${providerCode}) Check the Tripo task history before attempting another generation.`;
}
async function tripo(path,body){
 if(!process.env.TRIPO_API_KEY)bad(503,'Your teacher needs to connect Tripo on the server.');
 let r;try{r=await fetch(`https://openapi.tripo3d.ai/v3/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${process.env.TRIPO_API_KEY}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});}catch{bad(503,body?'The generation service connection was interrupted. Your request is reserved; ask your teacher to check the existing job before trying again.':'Progress is temporarily unavailable. Your existing generation is still saved. We will check again.');}
 const d=await r.json().catch(()=>null);if(!r.ok||d?.code!==0)bad(502,tripoFailure(r.status,d));return d.data;
}
export async function boundedDownload(url){
 const u=new URL(url);
 // The .com data host was observed in an authenticated successful Tripo task.
 // Keep this exact: allowing every .com or cloud-storage host is unnecessary.
 const allowed=tripoAssetHost(u.hostname);
 if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!allowed)bad(502,'Unexpected model download host; teacher intervention required.');
 const r=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(45000)});
 if(!r.ok)bad(502,'The generated model could not be downloaded. Refresh status to retry.');
 const chunks=[];let length=0;
 for await(const chunk of r.body){length+=chunk.length;if(length>50*1024*1024)bad(413,'The model is too large for this workshop.');chunks.push(chunk);}
 const buffer=Buffer.concat(chunks);if(buffer.toString('ascii',0,4)!=='glTF')bad(502,'Tripo did not return a GLB mesh.');return buffer;
}
// Exact CDN hosts observed in authenticated successful Tripo tasks.
const tripoAssetHost=host=>host==='tripo3d.ai'||host.endsWith('.tripo3d.ai')||host==='tripo-data.rg1.data.tripo3d.com'||host==='openapi-dl.data.tripo3d.com';
function viewImages(task){
 const output=task.output?.generate_multiview_image??task.output;
 const images={};for(const name of ['front','left','back','right']){
  let u;try{u=new URL(output?.[`${name}_view_url`]);}catch{bad(502,'Tripo did not return all four preview images. Ask your teacher to check the existing job.');}
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!tripoAssetHost(u.hostname))bad(502,'Unexpected multiview image host. Ask your teacher to check the existing job.');
  images[name]=u.href;
 }return images;
}
export async function dispatch(input,req){
 const adminActions=['issue','list','schools','createTeacherAccess','reviewImage','createSchool','setSchoolActive','review','teacherSave','teacherRestore','teacherFile','replace','allowance','reconcile','archive','printed'];
 const admin=adminActions.includes(input.action),scope=admin?await requireLabAccess(req):null;
 const scopedClass=classCode=>{if(scope?.role==='teacher'&&String(classCode)!==scope.classCode)bad(403,'This teacher account can only access its assigned classroom.');};
 if(scope?.role==='teacher'&&['createSchool','setSchoolActive','createTeacherAccess'].includes(input.action))bad(403,'Only the owner can manage schools and teacher access.');
 await rateLimit(req,`lab-${admin?'teacher-'+(scope.classCode||'owner'):'student'}`,admin?300:3000,60);
 if(input.action==='login'){await rateLimit(req,'lab-login',12,60);return signInLab(input);}
 if(input.action==='createTeacherAccess'){if(!/^[1-9][0-9]{3}$/.test(input.classCode))bad(400,'Choose a classroom.');const credential=teacherCredential();await database('lab_classroom_access',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:{class_code:input.classCode,salt:credential.salt,key_hash:credential.key_hash,active:true,updated_at:new Date().toISOString()}});return {classCode:input.classCode,accessCode:credential.accessCode};}
 if(input.action==='config')return {imageGeneration:true};
 if(input.action==='image'){const key=req.headers['x-heyotto-api-key'];if(typeof key!=='string'||!/^ak_[!-~]{5,300}$/.test(key))bad(401,'Enter your HeyOtto API key. It begins with ak_.');await rateLimit(req,`lab-image-${createHash('sha256').update(key).digest('hex').slice(0,24)}`,8,60);return generateOttoImage({key,prompt:input.prompt,requestId:input.requestId,confirm:input.confirm,history:input.history,conversationId:input.conversationId,selectedImage:input.selectedImage});}
 if(input.action==='approveImage')bad(410,'Send your chosen image to your classroom teacher for approval.');
 if(input.action==='issue'){
  if(!/^[1-9][0-9]{3}$/.test(input.classCode))bad(400,'Enter an existing classroom code.');scopedClass(input.classCode);
  const school=await database(`topbot_schools?classCode=eq.${input.classCode}&active=eq.true`);if(!school.length)bad(404,'Active classroom not found.');
  for(let attempt=0;attempt<20;attempt++){
   const id=randomInt(36**6).toString(36).toUpperCase().padStart(6,'0');
   // Avoid collisions with both new codes and older projects' six-character suffixes.
   const existing=await database(`lab_students?code=like.*${id}&select=code&limit=1`);if(existing.length)continue;
   const inserted=await database('lab_students',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:{code:id,class_code:input.classCode}});
   if(inserted?.length)return {code:id};
  }bad(503,'Could not allocate a project code. Please try again.');
 }
 if(input.action==='schools'){
  const offset=input.offset??0;if(!Number.isSafeInteger(offset)||offset<0)bad(400,'Invalid page.');
  return database(`topbot_schools?${scope?.classCode?`classCode=eq.${scope.classCode}&`:""}select=classCode,schoolName,active,expectedStudents&order=schoolName&limit=200&offset=${offset}`);
 }
 if(input.action==='createSchool'){
  if(typeof input.schoolName!=='string'||!input.schoolName.trim()||input.schoolName.trim().length>80)bad(400,'Enter a school or classroom name of up to 80 characters.');
  return database('rpc/topbot_create_school',{method:'POST',body:{school_name:input.schoolName.trim(),expected_students:null}});
 }
 if(input.action==='setSchoolActive'){
  if(!/^[1-9][0-9]{3}$/.test(input.classCode)||typeof input.active!=='boolean')bad(400,'Invalid classroom.');
  return database(`topbot_schools?classCode=eq.${input.classCode}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:{active:input.active,archivedAt:input.active?null:new Date().toISOString()}});
 }
 if(input.action==='list'){
  const offset=input.offset??0;if(!Number.isSafeInteger(offset)||offset<0)bad(400,'Invalid page.');
  const result=await database(`lab_students?${scope?.classCode?`class_code=eq.${scope.classCode}&`:""}select=*&order=created_at.desc&limit=100&offset=${offset}`);return result.map(({image_path,model_path,project_path,stl_path,image_review_path,reviewed_project_path,...r})=>({...r,has_image:!!image_path,has_model:!!model_path,has_project:!!project_path,has_stl:!!stl_path,edits_reviewed:!!project_path&&reviewed_project_path===project_path,display_code:shortCode(r.code)}));
 }
 if(input.action==='assist')bad(410,'Workshop assistance has been removed.');
 const s=await row(input.code);if(admin)scopedClass(s.class_code);
 const workflow=()=>{if(!Object.hasOwn(s,'image_approval'))bad(503,'The classroom/image approval database update is needed. Run lab/003_classrooms.sql once in Supabase.');};
 if(!admin){
  if(s.archived)bad(404,'This project is archived. Ask your teacher to restore it.');
  const school=await database(`topbot_schools?classCode=eq.${s.class_code}&active=eq.true`);if(!school.length)bad(403,'Your classroom is archived. Ask your teacher.');
 }
 switch(input.action){
 case 'status':{
  if(input.passive===true)return {...studentView(s),phase:s.task_id?.startsWith('views:')?'views':s.task_id?.startsWith('preview:')?'preview':'model'};
  if(s.state==='processing'&&s.task_id){
   const preview=s.task_id.startsWith('preview:'),views=preview||s.task_id.startsWith('views:'),providerId=preview?s.task_id.slice(8):views?s.task_id.slice(6):s.task_id;
   const task=await tripo(`tasks/${encodeURIComponent(providerId)}`);
   if(task.status==='success'){
    if(views){
     const images=viewImages(task);
     if(!preview){const changed=await patch(s.code,{task_id:`preview:${providerId}`},`&state=eq.processing&task_id=eq.${encodeURIComponent(s.task_id)}`);if(!changed.length)return studentView(await row(s.code));}
     return {...studentView(s),phase:'preview',multiviewReady:true,images};
    }
    const key=s.code+':'+s.task_id;
    if(!modelTransfers.has(key)){const transfer=(async()=>{const data=await boundedDownload(task.output?.model_url||task.output?.model?.url);const path=await store(`${s.code}/${randomUUID()}.glb`,data,'model/gltf-binary');await database('rpc/lab_finish',{method:'POST',body:{student_code:s.code,expected_task:s.task_id,stored_path:path}});})();modelTransfers.set(key,transfer);transfer.finally(()=>modelTransfers.delete(key)).catch(()=>{});}
    await modelTransfers.get(key);
   }else if(['failed','cancelled','banned'].includes(task.status))await patch(s.code,{state:'failed'},`&state=eq.processing&task_id=eq.${encodeURIComponent(s.task_id)}`);
   else return {...studentView(s),phase:views?'views':'model',progress:Number.isFinite(task.progress)?task.progress:undefined};
  }
  return studentView(await row(s.code));
 }
 case 'continueViews':{workflow();if(s.image_approval!=='approved'||s.image_review_path!==s.image_path)bad(403,'Your teacher must approve the uploaded image before building the model.');
  if(input.confirm!==true)bad(400,'Confirm the 20-credit model step after checking your four views.');
  if(s.state!=='processing'||!s.task_id?.startsWith('preview:'))bad(409,'Check your four views before starting the model, or refresh its current status.');
  if(s.used>=s.allowance)bad(409,'Your successful-generation allowance is used. Ask your teacher before starting the model.');
  const providerId=s.task_id.slice(8),claim=`starting:${providerId}`;
  const claimed=await patch(s.code,{state:'reserved',task_id:claim},`&state=eq.processing&task_id=eq.${encodeURIComponent(s.task_id)}`);
  if(!claimed.length)return studentView(await row(s.code));
  const {input:unused,...options}=tripoRequest('');
  const model=await tripo('generation/multiview-to-model',{...options,inputs:[{task_id:providerId}]});
  if(!model.task_id)bad(502,'Tripo returned no model job ID. Ask your teacher to reconcile this reservation.');
  await patch(s.code,{state:'processing',task_id:model.task_id},`&state=eq.reserved&task_id=eq.${encodeURIComponent(claim)}`);return {...studentView(await row(s.code)),phase:'model'};
 }
 case 'discardViews':{
  if(input.confirm!==true||s.state!=='processing'||!s.task_id?.startsWith('preview:'))bad(409,'Only a completed multiview preview can be set aside.');
  await patch(s.code,{state:'failed',task_id:null},`&state=eq.processing&task_id=eq.${encodeURIComponent(s.task_id)}`);return studentView(await row(s.code));
 }
 case 'resume':{
  if(!canReadModel(s))bad(403,'Your teacher is checking this model. It is not ready to open yet.');
  const released=s.reviewed_project_path,kind=(!input.original&&s.project_path)||released?'project':'model';return {kind,url:await signed(kind==='project'?(input.original?released:s.project_path||released):s.model_path),version:s.updated_at};
 }
 case 'restore':case 'teacherRestore':{
  if(!canReadModel(s,admin))bad(403,'Wait for your teacher to release this model.');
  const kind=s.reviewed_project_path?'project':'model',path=s.reviewed_project_path||s.model_path;return {kind,url:await signed(path),version:s.updated_at};
 }
 case 'reviewImage':{workflow();if(s.state==='reserved'||s.state==='processing'&&!s.task_id?.startsWith('preview:'))bad(409,'Generation is already running. Review its model when it finishes.');if(!s.image_path||!['approved','rejected','pending'].includes(input.approval))bad(400,'Choose an uploaded image and decision.');if(input.imageVersion!==s.updated_at)bad(409,'This image changed. Open the latest upload before approving.');const changed=await patch(s.code,{image_approval:input.approval,image_review_path:input.approval==='approved'?s.image_path:null},`&image_path=eq.${encodeURIComponent(s.image_path)}&updated_at=eq.${encodeURIComponent(s.updated_at)}`);if(!changed.length)bad(409,'The uploaded image changed during review.');return {saved:true};}
 case 'uploadImage':{workflow();
  if(['reserved','processing'].includes(s.state))bad(409,'Please wait for the current generation.');
  let image;if(input.url!==undefined)image=await downloadOttoImage(input.url);else{if(typeof input.data!=='string'||input.data.length>4e6)bad(413,'Choose an image smaller than 3 MB.');const buffer=Buffer.from(input.data,'base64');image={buffer,...imageType(buffer)};}
  const path=await store(`${s.code}/${randomUUID()}.${image.ext}`,image.buffer,image.type),changed=await patch(s.code,{image_path:path,image_approval:'pending',image_review_path:null},`&state=not.in.(reserved,processing)&updated_at=eq.${encodeURIComponent(s.updated_at)}`);if(!changed.length)bad(409,'This project changed while sending the image. Refresh its status before sending again.');return {saved:true};
 }
 case 'generate':{workflow();
  if(s.image_approval!=='approved'||s.image_review_path!==s.image_path)bad(403,'Your teacher must approve this exact uploaded image before Tripo can run.');
  if(!['reserved','processing'].includes(s.state)&&s.view_used>=s.view_allowance)bad(409,'This project has used its view-generation attempt. Ask your teacher for another code or allowance.');
  if(input.confirm!==true)bad(400,'Confirm before using your 3D generation allowance.');
  if(input.confirmMultiview!==true)bad(400,'Confirm the 10-credit multiview image step before generating.');
  if(!process.env.TRIPO_API_KEY)bad(503,'Tripo is not configured.');
  if(!['reserved','processing'].includes(s.state)){
   if(s.used>=s.allowance)bad(409,'Your successful-generation allowance is used. Ask your teacher for an extra generation.');
   if(!s.image_path)bad(400,'Choose and save an image before generating a model.');
  }
  const result=await database('rpc/lab_reserve',{method:'POST',body:{student_code:s.code}});
  if(!result.reserved)return studentView(await row(s.code));
  // An ambiguous network failure stays reserved. Never retry a paid POST automatically.
  const image=await signed(s.image_path);
  const views=true;
  const task=await tripo('generation/image-to-multiview',{input:image});
  if(!task.task_id)bad(502,'Tripo returned no job ID. Ask your teacher to reconcile this reservation.');
  await patch(s.code,{state:'processing',task_id:views?`views:${task.task_id}`:task.task_id},'&state=eq.reserved');return studentView(await row(s.code));
 }
 case 'file':case 'teacherFile':{
  if(!canReadModel(s,admin))bad(403,'Your teacher is checking this model. It is not ready to open yet.');
  const kinds=admin?['model','project','stl','image']:['model','project','stl'];
  if(!kinds.includes(input.kind))bad(400,'Unknown file type.');if(!admin&&input.kind==='model'&&s.reviewed_project_path)return {kind:'project',url:await signed(s.reviewed_project_path)};
  const schools=await database(`topbot_schools?classCode=eq.${s.class_code}&select=schoolName`),school=(schools[0]?.schoolName||'Classroom').normalize('NFKD').replace(/[^a-zA-Z0-9 -]/g,'').trim().replace(/\s+/g,'-').slice(0,80)||'Classroom',extension=input.kind==='model'?'glb':input.kind==='stl'?'stl':input.kind==='project'?'json':'png';
  return {url:await signed(s[`${input.kind}_path`]),filename:`${school}_${s.class_code}_${shortCode(s.code)}.${extension}`};
 }
 case 'save':{
  if(!canReadModel(s))bad(403,'Wait for teacher approval before saving edits.');
  if(input.baseVersion&&input.baseVersion!==s.updated_at)bad(409,'Your teacher or another tab updated this project. Save a device copy of your edits, then reopen the latest version.');
  disposeMeshes(readProject(input));
  const path=await storeProject(s.code,input.project);
  const changed=await patch(s.code,{project_path:path,submitted:false,printed:false,stl_path:null},`&updated_at=eq.${encodeURIComponent(s.updated_at)}`);if(!changed.length)bad(409,'Your project changed in another tab or during teacher review. Reopen it before saving again.');return {saved:true,code:s.code,submissionReset:!!s.submitted,version:changed[0].updated_at};
 }
 case 'submit':{
  if(!canReadModel(s)||input.classCode!==undefined&&input.classCode!==s.class_code)bad(403,'Check your project code and teacher approval.');
  if(input.baseVersion&&input.baseVersion!==s.updated_at)bad(409,'This project changed in another tab or during teacher review. Reopen the latest version before sending.');
  if(input.packed||input.project){const b=printMesh(readProject(input)),projectPath=await storeProject(s.code,input.project),stlPath=await storeSTL(s.code,b);const changed=await patch(s.code,{project_path:projectPath,stl_path:stlPath,submitted:true,printed:false},`&updated_at=eq.${encodeURIComponent(s.updated_at)}`);if(!changed.length)bad(409,'Your project changed while sending. The previous version was kept; reopen the latest project.');return {saved:true,submitted:true,version:changed[0].updated_at};}
  if(!s.project_path)bad(409,'Save your editable project before submitting.');
  const projectResponse=await fetch(await signed(s.project_path),{signal:AbortSignal.timeout(45000)});if(!projectResponse.ok)bad(503,'Could not read the saved Workshop for print checks.');const b=printMesh(readProject({project:await readStoredProject(projectResponse)}));
  const path=await storeSTL(s.code,b);const changed=await patch(s.code,{stl_path:path,submitted:true,printed:false},`&project_path=eq.${encodeURIComponent(s.project_path)}&updated_at=eq.${encodeURIComponent(s.updated_at)}`);if(!changed.length)bad(409,'The saved project changed while preparing the print. Send the latest version again.');return {submitted:true,version:changed[0].updated_at};
 }
 case 'teacherSave':{
  workflow();if(!s.model_path)bad(409,'Wait for model generation to finish.');
  if(input.reviewVersion!==s.updated_at)bad(409,'This project changed after you opened it. Reopen the latest version before releasing.');
  if(s.image_approval!=='approved')bad(403,'Approve the uploaded image first.');
  const meshes=readProject(input),printing=input.printReady===true||s.submitted===true;
  let stl;if(printing)stl=printMesh(meshes);else disposeMeshes(meshes);
  const projectPath=await storeProject(s.code,input.project),stlPath=stl?await storeSTL(s.code,stl):null;
  const changed=await patch(s.code,{project_path:projectPath,reviewed_project_path:projectPath,approval:'approved',state:'ready',stl_path:stlPath,submitted:printing,printed:false},`&updated_at=eq.${encodeURIComponent(s.updated_at)}`);
  if(!changed.length)bad(409,'The project changed while you were editing. Your release was not applied.');return {saved:true,submitted:printing,version:changed[0].updated_at};
 }
 case 'review':{
  if(input.approval==='approved')workflow();
  if(input.approval==='approved'&&s.image_approval!=='approved')bad(403,'Approve the uploaded image before releasing the model.');
  if(typeof input.reviewVersion!=='string'||input.reviewVersion!==s.updated_at)bad(409,'The project changed after you opened it. Reopen the latest version before approving.');
  if(!s.model_path||!['approved','rejected','pending'].includes(input.approval))bad(400,'Choose a generated model and review decision.');
  if(input.kind==='project'){if(!s.project_path)bad(409,'There are no saved Workshop edits.');const changed=await patch(s.code,{reviewed_project_path:input.approval==='approved'?s.project_path:null},`&project_path=eq.${encodeURIComponent(s.project_path)}`);if(!changed.length)bad(409,'The saved Workshop changed during review.');return {saved:true};}
  const changed=await patch(s.code,{approval:input.approval,state:input.approval==='approved'?'ready':'review'},`&model_path=eq.${encodeURIComponent(s.model_path)}`);
  if(!changed.length)bad(409,'The model changed during review. Reload and review the replacement.');return {saved:true};
 }
 case 'replace':{
  const b=Buffer.from(input.data||'','base64');if(b.length>3e6||b.toString('ascii',0,4)!=='glTF')bad(400,'Upload a GLB smaller than 3 MB.');
  const path=await store(`${s.code}/${randomUUID()}.glb`,b,'model/gltf-binary');
  await patch(s.code,{model_path:path,project_path:null,stl_path:null,submitted:false,printed:false,approval:'pending',state:'review'});return {saved:true};
 }
 case 'allowance':{
  if(!Number.isInteger(input.allowance)||input.allowance<s.used||input.allowance>10)bad(400,'Set an allowance between the used count and 10.');
  await patch(s.code,{allowance:input.allowance,...(Object.hasOwn(s,'view_allowance')?{view_allowance:input.allowance}: {})});return {saved:true};
 }
 case 'reconcile':{
  if(s.state!=='reserved')bad(409,'Only an uncertain reservation can be reconciled.');
  if(typeof input.taskId==='string'&&/^[\w-]{5,150}$/.test(input.taskId)){
   await patch(s.code,{task_id:input.taskKind==='views'?`views:${input.taskId}`:input.taskId,state:'processing'},'&state=eq.reserved');
  }
  else if(input.confirmNoTask===true)await patch(s.code,{state:'failed'});
  else bad(400,'Enter the existing Tripo job ID, or confirm in the Tripo console that no job was created.');return {saved:true};
 }
 case 'archive':if(typeof input.archived!=='boolean')bad(400,'Invalid archive state.');await patch(s.code,{archived:input.archived});return {saved:true};
 case 'printed':if(!s.submitted||typeof input.printed!=='boolean')bad(400,'Choose a submitted model.');await patch(s.code,{printed:input.printed});return {saved:true};
 default:bad(400,'Unknown request.');
 }
}
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Use POST.'});
 try{
  if(!String(req.headers['content-type']||'').startsWith('application/json'))bad(415,'Use JSON.');
  const origin=req.headers.origin,host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  if(!origin||new URL(origin).host!==host)bad(403,'Use this application from its own browser page.');
  json(res,200,{ok:true,result:await dispatch(await readBody(req,4.2e6),req)});
 }catch(e){if(!e.status){console.error('3D Lab request failed:',e.name, String(e.stack||'').split('\n').slice(1,4).join('\n'));e=new HttpError(503,'This action could not finish. Your existing saved work is kept. Please try again; if this was generation, check the existing job first.');}fail(res,e);}
}
