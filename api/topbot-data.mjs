import {json, readBody, fail, HttpError} from '../server/http.mjs';
import {requireAdmin} from '../server/session.mjs';
import {database, rateLimit} from '../server/database.mjs';
import {validateRecipe} from '../topbot/js/recipe-validation.js';

const code = (value, pattern) => {
  if (typeof value !== 'string' || !pattern.test(value)) throw new HttpError(400,'Invalid code.');
  return value;
};
const schoolCode = value => code(value,/^[1-9][0-9]{3}$/);
const topCode = value => code(value,/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
const text = (value, length) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > length) throw new HttpError(400,'Please check the name entered.');
  return value.trim().replace(/\s+/g,' ');
};
export default async function handler(req,res) {
  if(req.method !== 'POST') { res.setHeader('Allow','POST'); return json(res,405,{ok:false,error:'Method not allowed'}); }
  try {
    const input = await readBody(req);
    const publicAction = ['submitTop','loadTop'].includes(input.action);
    if (!publicAction) requireAdmin(req);
    let result;
    switch(input.action) {
      case 'listSchools':
      case 'listTops': {
        const offset = input.offset ?? 0;
        if (!Number.isSafeInteger(offset) || offset < 0) throw new HttpError(400,'Invalid page.');
        const table = input.action === 'listSchools' ? 'topbot_schools' : 'topbot_tops';
        const fields = input.action === 'listSchools' ? '*' : 'topCode,classCode,studentName,filament,submittedAt,updatedAt,printStatus,trashed,trashedAt';
        const order = input.action === 'listSchools' ? 'classCode' : 'topCode';
        result = await database(`${table}?select=${fields}&order=${order}&limit=200&offset=${offset}`);
        break;
      }
      case 'createSchool': {
        const expected = input.expectedStudents;
        if (expected !== null && (!Number.isInteger(expected) || expected < 1 || expected > 100)) throw new HttpError(400,'Expected students must be between 1 and 100.');
        result = await database('rpc/topbot_create_school',{method:'POST',body:{school_name:text(input.schoolName,80),expected_students:expected}});
        break;
      }
      case 'setSchoolActive': {
        if(typeof input.active !== 'boolean') throw new HttpError(400,'Invalid school state.');
        const rows = await database(`topbot_schools?classCode=eq.${schoolCode(input.classCode)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:{active:input.active,archivedAt:input.active?null:new Date().toISOString()}});
        if (!rows.length) throw new HttpError(404,'School not found.');
        result = rows[0]; break;
      }
      case 'submitTop': {
        await rateLimit(req,'submit',120,600);
        const submissionId = code(input.submissionId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        if(!['pastel','vivid','white'].includes(input.filament)) throw new HttpError(400,'Choose a filament.');
        let recipe;
        try { recipe = validateRecipe(input.recipe); } catch { throw new HttpError(400,'This top has an invalid design recipe.'); }
        result = await database('rpc/topbot_submit',{method:'POST',body:{submission_id:submissionId,school_code:schoolCode(input.classCode),student_name:text(input.studentName,30),chosen_filament:input.filament,design_recipe:recipe}});
        break;
      }
      case 'loadTop':
      case 'adminTop': {
        if (publicAction) await rateLimit(req,'load',120,600);
        const fields = publicAction ? 'topCode,classCode,filament,recipe' : '*';
        const rows = await database(`topbot_tops?topCode=eq.${topCode(input.topCode)}${publicAction?'&trashed=eq.false':''}&select=${fields}`);
        if(!rows.length) throw new HttpError(404,'Top Code not found.');
        result=rows[0]; break;
      }
      case 'updateTop': {
        const patch={updatedAt:new Date().toISOString()};
        if (input.printStatus !== undefined) {
          if (!['waiting','printed'].includes(input.printStatus)) throw new HttpError(400,'Invalid print status.');
          patch.printStatus=input.printStatus;
        }
        if (input.trashed !== undefined) {
          if(typeof input.trashed !== 'boolean') throw new HttpError(400,'Invalid trash state.');
          patch.trashed=input.trashed; patch.trashedAt=input.trashed?patch.updatedAt:null;
        }
        if(Object.keys(patch).length===1) throw new HttpError(400,'No update provided.');
        const rows=await database(`topbot_tops?topCode=eq.${topCode(input.topCode)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:patch});
        if(!rows.length) throw new HttpError(404,'Top not found.');
        const {recipe,...metadata}=rows[0]; result=metadata; break;
      }
      default: throw new HttpError(400,'Unknown request.');
    }
    json(res,200,{ok:true,result});
  } catch(error) { fail(res,error); }
}
