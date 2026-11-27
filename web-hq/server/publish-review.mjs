import {usesLeaderboard} from '../src/leaderboard-contract.mjs';

// All writes also lock the website row through activeProject. Approval refers
// to an immutable version and a freshly reviewed media-library revision.
export function publicationReview({db,user,first,all,query,id,now,fail,json,body,staff,classAccess}){
 async function submit(p,b,thumbnail){
  const reviewId=id(),versionId=id(),created=now();
  const result=await db.batch([
   query(db,"INSERT INTO versions(id,project_id,source,css,kind,title,description,revision,created,label,published,thumbnail,origin) SELECT ?,id,source,css,kind,title,description,revision,?,'Submitted for teacher review',0,?,'publication-review' FROM projects WHERE id=? AND revision=?",versionId,created,thumbnail,p.id,b.revision),
   query(db,"UPDATE publish_reviews SET status='superseded' WHERE project_id=? AND status='pending' AND EXISTS(SELECT 1 FROM versions WHERE id=?)",p.id,versionId),
   query(db,"INSERT INTO publish_reviews(id,project_id,version_id,requested_by,created,status) SELECT ?,?,?,?,?, 'pending' WHERE EXISTS(SELECT 1 FROM versions WHERE id=?)",reviewId,p.id,versionId,user.id,created,versionId),
   query(db,'UPDATE projects SET pending_review_id=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM publish_reviews WHERE id=?)',reviewId,p.id,b.revision,reviewId)
  ],{activeProject:p.id});
  if(!result[3].meta.changes)fail(409,'Your draft changed. Save and submit it again.');
  return json({pending:true,reviewId,publishedId:p.published_id,review:{id:reviewId,status:'pending',created,note:''}},202);
 }
 async function route(path,req){
  if(path==='/api/reviews'&&req.method==='GET'){
   staff();return json({reviews:await all(db,"SELECT r.id,r.created,v.title,u.name AS author,c.name AS className,p.id AS projectId FROM publish_reviews r JOIN projects p ON p.id=r.project_id JOIN versions v ON v.id=r.version_id JOIN users u ON u.id=p.owner JOIN classes c ON c.id=p.class_id WHERE r.status='pending' AND p.pending_review_id=r.id AND p.trashed=0 AND (?='admin' OR c.teacher=? OR EXISTS(SELECT 1 FROM class_teachers ct WHERE ct.class_id=c.id AND ct.user_id=?)) ORDER BY r.created,r.id",user.role,user.id,user.id)});
  }
  const removal=path.match(/^\/api\/projects\/([^/]+)\/media\/([^/]+)\/remove$/);
  if(removal&&req.method==='POST'){
   staff();const p=await first(db,'SELECT * FROM projects WHERE id=?',removal[1]);if(!p)fail(404,'Website not found.');await classAccess(p.class_id);
   const b=await body(req);if(b.confirmDelete!==true)fail(400,'Confirm removal of this file.');
   const file=await first(db,'SELECT id FROM media WHERE id=? AND project_id=?',removal[2],p.id);if(!file)fail(404,'File not found.');
   await db.batch([query(db,'DELETE FROM media WHERE id=? AND project_id=?',file.id,p.id),query(db,'UPDATE projects SET media_revision=media_revision+1 WHERE id=?',p.id),query(db,"UPDATE versions SET thumbnail='' WHERE project_id=?",p.id)],{activeProject:p.id});
   return json({ok:true});
  }
  const match=path.match(/^\/api\/reviews\/([^/]+)(?:\/(decision))?$/);if(!match)return null;
  staff();const review=await first(db,'SELECT * FROM publish_reviews WHERE id=?',match[1]);if(!review)fail(404,'Review not found.');
  const p=await first(db,'SELECT * FROM projects WHERE id=?',review.project_id);if(!p||p.trashed)fail(404,'Website not available.');await classAccess(p.class_id);
  if(!match[2]&&req.method==='GET'){
   const version=await first(db,'SELECT id,source,css,kind,title,description,revision FROM versions WHERE id=? AND project_id=?',review.version_id,p.id);
   if(!version)fail(404,'Submitted version not found.');
   return json({review,version,project:{id:p.id,publishedId:p.published_id,mediaRevision:p.media_revision},media:await all(db,'SELECT id,name,mime,size,created FROM media WHERE project_id=? ORDER BY created,id',p.id)});
  }
  if(match[2]&&req.method==='POST'){
   const b=await body(req);if(!['approve','changes'].includes(b.decision)||!Number.isSafeInteger(b.mediaRevision))fail(400,'Review the page and its media library first.');
   const note=String(b.note||'').trim().slice(0,600);if(b.decision==='changes'&&!note)fail(400,'Tell the student what needs changing.');
   if(b.decision==='approve'&&b.confirmReview!==true)fail(400,'Confirm that you checked the page and its media library.');
   const approved=b.decision==='approve',status=approved?'approved':'changes',reviewed=now();
   const result=await db.batch([
    query(db,"UPDATE publish_reviews SET status=?,reviewed_by=?,reviewed_at=?,note=? WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM projects WHERE id=? AND pending_review_id=? AND media_revision=? AND trashed=0)",status,user.id,reviewed,note,review.id,p.id,review.id,b.mediaRevision),
    query(db,`UPDATE projects SET ${approved?'published_id=?,':''}pending_review_id=NULL WHERE id=? AND pending_review_id=? AND media_revision=? AND EXISTS(SELECT 1 FROM publish_reviews WHERE id=? AND status=? AND reviewed_by=? AND reviewed_at=?)`,...(approved?[review.version_id]:[]),p.id,review.id,b.mediaRevision,review.id,status,user.id,reviewed),
    ...(approved?[
     query(db,"UPDATE versions SET published=1,label='Teacher approved' WHERE id=? AND EXISTS(SELECT 1 FROM projects WHERE id=? AND published_id=?)",review.version_id,p.id,review.version_id),
     query(db,'UPDATE media SET approved=1 WHERE project_id=? AND EXISTS(SELECT 1 FROM projects WHERE id=? AND published_id=?)',p.id,p.id,review.version_id)
    ]:[])
   ],{activeProject:p.id});
   if(!result[0].meta.changes||!result[1].meta.changes)fail(409,'This request or its media library changed. Refresh the review before deciding.');
   if(approved){const v=await first(db,'SELECT source FROM versions WHERE id=?',review.version_id);if(usesLeaderboard(v.source))await query(db,'INSERT INTO boards(project_id,enabled) SELECT ?,1 WHERE EXISTS(SELECT 1 FROM projects WHERE id=? AND published_id=?) ON CONFLICT(project_id) DO NOTHING',p.id,p.id,review.version_id).run();}
   return json({ok:true,status,publishedId:approved?review.version_id:p.published_id});
  }
  return null;
 }
 return {route,submit};
}
