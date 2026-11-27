// Published-content fixtures submit as a student, then approve through the real
// staff endpoint. Publication-safety tests deliberately use the raw API.
import {api} from '../../server/app.mjs';
import {createHash,randomBytes} from 'node:crypto';
export async function apiWithApprovedPublishes(req,env){
 const response=await api(req,env);if(req.method!=='POST'||!new URL(req.url).pathname.endsWith('/publish')||response.status!==202)return response;
 const pending=await response.clone().json();if(!pending.pending)return response;
 const db=env.DB;let admin=await db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").first();
 if(!admin){admin={id:'publication-fixture-admin'};await db.prepare("INSERT INTO users(id,username,name,password,role,permanent_id,vault_id) VALUES(?,?,?,'unused-test-hash','admin',?,?)").bind(admin.id,admin.id,'Fixture approver',admin.id,admin.id).run();}
 const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex'),origin=new URL(req.url).origin;
 await db.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').bind(hash,admin.id,Date.now()+60000).run();
 const headers={cookie:'studio_session='+token,origin,'content-type':'application/json'};
 try{
  const detail=await api(new Request(origin+'/api/reviews/'+pending.reviewId,{headers}),env);if(!detail.ok)throw new Error('Fixture review failed');
  const reviewed=await detail.json();const approved=await api(new Request(origin+'/api/reviews/'+pending.reviewId+'/decision',{method:'POST',headers,body:JSON.stringify({decision:'approve',confirmReview:true,mediaRevision:reviewed.project.mediaRevision})}),env);
  if(!approved.ok)throw new Error('Fixture approval failed: '+await approved.text());return approved;
 }finally{await db.prepare('DELETE FROM sessions WHERE token=?').bind(hash).run();}
}
