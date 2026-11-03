# Put 3D Lab online
Prepared 3 November 2026 for ai-adventure-bi/ai-adventure-web-tools.

## 1. Vercel settings
Open the existing Vercel project for this repository > Settings > Environment Variables. Keep SUPABASE_URL, SUPABASE_SECRET_KEY, TOPBOT_ADMIN_CODE and TOPBOT_SESSION_SECRET. Add TRIPO_API_KEY from your working local .env. Enable Production, and Preview if you want preview testing. Never put actual keys in GitHub. Students use their own HeyOtto keys; no shared HeyOtto key is needed.

The Supabase URL/secret must match your working local Lab database. Using the same database preserves existing codes, classrooms and models. There is no database migration to do for your existing working installation. A different database will not contain your saved codes.

Under Settings > Functions, enable Fluid Compute if this older project does not have it enabled. The included function configuration allows 300 seconds for image generation/saving. Keep Root Directory at repository root, build command npm run build, Output Directory _site (set in vercel.json). Do not select 3d-lab as the Vercel root. Use Node 22.x or compatible newer supported Node.

## 2. Upload to GitHub
Repository > Code > Add file > Upload files. Drag the CONTENTS of github-upload into repository root, preserving folders. Do not upload the outer github-upload folder, its ZIP, the working sandbox or local .env. Commit as Add independent 3D Lab workshop.

Included:
- 3d-lab/ independent app, tests, blank settings example and SQL reference.
- api/3d-lab.mjs dedicated endpoint; preserve existing api files.
- scripts/assemble-vercel-site.mjs existing assembly plus public Lab assets.
- package.json existing build plus Lab build first.
- vercel.json existing routes/functions plus Lab function duration.
- index.html existing tools hub plus 3D Lab card.
- This guide and SOURCE-COMMIT.txt.

The four replacement files are based on main commit 1bf8ddd83119fd206cf583bb92bea89c2474f8b8. If main changes after preparation, merge the small Lab additions into the newer versions instead of overwriting newer work. Existing Quake Quest routing and current hub cards were preserved.

If browser upload will not overwrite files, use GitHub Desktop: clone the repository, merge the upload folder contents into that clone, review Changes, commit, Push origin. Never delete/replace the entire existing api or scripts directories.

## 3. Wait for deployment
Vercel > Deployments > wait for Ready for your commit. If environment variables were changed after the build began, redeploy the latest commit. Use Vercel, not GitHub Pages: Pages cannot run the private server actions.

Expected address once deployed:
https://ai-adventure-web-tools.vercel.app/3d-lab/
The existing hub will also display a 3D Lab card. TopBot retains its own interface. The Lab reuses classroom records and shared server helpers.

## 4. Check before sharing
1. Open the Lab and try Upload an image instead without a key.
2. Open an existing approved test project; save an edit and reopen to verify persistence.
3. Open Admin using your existing owner code. Check classroom teacher access is limited to its own classroom.
4. On a test project, Send to Print Room, open it as teacher and download the edited STL. Check the edits and school/code filename.
5. When you choose to spend credits, test HeyOtto generation and a follow-up edit, teacher image approval, four-view preview, model generation, teacher release and student reopening. No live paid Vercel test has been done during preparation.

Issue more student project codes from Admin > classroom > issue project codes. Give each student their own code. Owner access can create/replace the six-character teacher key for a classroom; replacing a key invalidates the old key and its sessions.

## Troubleshooting
- API 404: upload api/3d-lab.mjs at repository root and use Vercel.
- Missing project or database error: match Vercel Supabase settings to your local database, then redeploy.
- Tripo not configured: add TRIPO_API_KEY to the deployed environment, then redeploy.
- Timeout: check Fluid Compute and the 300-second function setting. Check the existing provider job before requesting another paid generation.
- Fresh Supabase only: run repository database/001_topbot.sql, then 3d-lab/lab/002_lab.sql, then 003_classrooms.sql. Do not rerun 002 on your existing installation.

Vercel bodies are limited to 4.5 MB; project uploads are compressed and bounded. Very large scenes may require local saving. Conversation history is tab-local. HeyOtto request deduplication is process-local, not durable across Vercel instances, so uncertain paid requests must not be automatically repeated. Models still need teacher/slicer inspection before printing.

References:
https://vercel.com/docs/functions/limitations
https://vercel.com/docs/environment-variables
