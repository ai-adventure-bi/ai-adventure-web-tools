import {createHmac,randomBytes,randomInt,scryptSync,timingSafeEqual} from 'node:crypto';
import {database} from '../../server/database.mjs';
import {requireAdmin,issueSession,equals} from '../../server/session.mjs';
import {HttpError} from '../../server/http.mjs';
const fail=(status,message)=>{throw new HttpError(status,message);};
const sign=value=>{if(!process.env.TOPBOT_SESSION_SECRET||process.env.TOPBOT_SESSION_SECRET.length<32)fail(503,'Teacher access is not configured.');return createHmac('sha256',process.env.TOPBOT_SESSION_SECRET).update('3d-lab-teacher:').update(process.env.TOPBOT_ADMIN_CODE||'').update(value).digest('base64url');};
export function teacherCredential(){const accessCode=randomInt(36**6).toString(36).toUpperCase().padStart(6,'0'),salt=randomBytes(16).toString('hex');return {accessCode,salt,key_hash:scryptSync(accessCode,salt,32).toString('hex')};}
export async function signInLab(input){
 if(typeof input.accessCode!=='string'||input.accessCode.length>300)fail(401,'Check your access code.');
 if(process.env.TOPBOT_ADMIN_CODE&&equals(input.accessCode,process.env.TOPBOT_ADMIN_CODE))return {...issueSession(),role:'owner'};
 if(!/^[1-9][0-9]{3}$/.test(input.classCode))fail(401,'Enter your classroom code and teacher access key.');
 const rows=await database(`lab_classroom_access?class_code=eq.${input.classCode}&active=eq.true`),row=rows[0],key=/^[a-z0-9]{6}$/i.test(input.accessCode.trim())?input.accessCode.trim().toUpperCase():input.accessCode,actual=scryptSync(key,row?.salt||'missing',32),expected=Buffer.from(row?.key_hash||'00'.repeat(32),'hex');
 if(!row||expected.length!==32||!timingSafeEqual(actual,expected))fail(401,'Check your classroom code and teacher access key.');
 const payload=Buffer.from(JSON.stringify({classCode:row.class_code,accessId:row.salt,expiresAt:Date.now()+6*3600000})).toString('base64url');return {token:`labt.${payload}.${sign(payload)}`,role:'teacher',classCode:row.class_code};
}
export async function requireLabAccess(req){
 const token=(req.headers.authorization||'').replace(/^Bearer /,'');
 if(!token.startsWith('labt.')){requireAdmin(req);return {role:'owner'};}
 const [,payload,signature,extra]=token.split('.');if(token.length>1500||!payload||!signature||extra||!equals(sign(payload),signature))fail(401,'Sign in to your classroom again.');
 let data;try{data=JSON.parse(Buffer.from(payload,'base64url').toString());}catch{fail(401,'Sign in again.');}
 if(!Number.isFinite(data.expiresAt)||data.expiresAt<=Date.now()||!/^[1-9][0-9]{3}$/.test(data.classCode))fail(401,'Sign in again.');
 const rows=await database(`lab_classroom_access?class_code=eq.${data.classCode}&active=eq.true`);if(rows[0]?.salt!==data.accessId)fail(401,'This teacher access key has been replaced or disabled.');return {role:'teacher',classCode:data.classCode};
}
