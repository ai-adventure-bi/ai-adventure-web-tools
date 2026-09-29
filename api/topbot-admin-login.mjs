import {json, readBody, fail, HttpError} from '../server/http.mjs';
import {equals, issueSession} from '../server/session.mjs';
import {rateLimit} from '../server/database.mjs';
export default async function login(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res,405,{ok:false,error:'Method not allowed'}); }
  try {
    const {code} = await readBody(req,4096);
    if (!process.env.TOPBOT_ADMIN_CODE) throw new HttpError(503,'Admin access is not configured on this server.');
    await rateLimit(req,'login',10,300);
    if (typeof code !== 'string' || !equals(code,process.env.TOPBOT_ADMIN_CODE)) throw new HttpError(401,'Incorrect admin code.');
    json(res,200,{ok:true,...issueSession()});
  } catch(error) { fail(res,error); }
}
