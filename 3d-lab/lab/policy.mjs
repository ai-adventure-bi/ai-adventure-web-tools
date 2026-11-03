import {shortCode} from './codes.mjs';
export const IMAGE_INSTRUCTION = `Generate an image depicting the student's requested subject, faithfully following their chosen artistic style, visual characteristics, composition and creative intentions.
Preserve the specified art style. Do not impose a default cartoon, toy-like, Pixar, DreamWorks or other predetermined aesthetic.
Reinterpret photorealism, photographic realism or lifelike rendering as high-quality stylised realism: believable materials, lighting, detail and proportions with a subtle illustrated or animated-fantasy quality. The realism ceiling is a sophisticated animated feature film, without resembling a particular studio.
Avoid explicit anatomical details, visible genitalia, nudity and sexualised features, including in animals, humans and fantasy creatures. Do not add unnecessary anatomical details.
Where compatible with the artistic intention, favour coherent clearly defined forms for physical 3D reconstruction. Do not otherwise simplify, infantilise or alter the design.`;
export function imageMessages(prompt) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) throw Error('Write a description of up to 2,000 characters.');
  return [{role:'user',content:`${IMAGE_INSTRUCTION}\nUse your image generation capability to create the image now and include the resulting image URL in your reply.\n\nStudent's original description:\n${prompt.trim()}`}];
}
export function tripoRequest(input) {
  return {input,model:'v2.5-20250123',face_limit:75000,texture:false,pbr:false};
}
export function studentView(row) {
  return {code:shortCode(row.code),classCode:row.class_code,status:row.state,approval:row.approval,imageApproval:row.image_approval||'pending',imageSubmitted:!!row.image_path,viewUsed:row.view_used||0,viewAllowance:row.view_allowance??1,submitted:row.submitted,printed:row.printed,version:row.updated_at,hasProject:!!row.project_path,editsApproved:!!row.project_path&&row.project_path===row.reviewed_project_path,screening:'Teacher review required; automated screening is not configured.'};
}
export function canReadModel(row,admin=false) { return admin || (row.approval === 'approved' && !row.archived); }
export function validateCommands(value) {
  if(!value || !Array.isArray(value.operations) || value.operations.length<1 || value.operations.length>8) throw Error('Otto must suggest between one and eight supported changes.');
  return value.operations.map(op=>{
    if(op.type==='scale_selected' && Number.isFinite(op.factor) && op.factor>=0.5 && op.factor<=2) return {type:op.type,factor:op.factor};
    if(op.type==='add_shapes' && ['cone','sphere','box'].includes(op.shape) && Number.isInteger(op.count) && op.count>=1 && op.count<=5) return {type:op.type,shape:op.shape,count:op.count};
    throw Error('This suggestion uses a change the workshop cannot safely perform.');
  });
}
