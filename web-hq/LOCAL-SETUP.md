# Local use and future Vercel hosting

No ChatGPT account or ChatGPT hosting is required. This is the current setup guide; it replaces the earlier hosting instructions in README.md.

## Start locally

Install Node.js 22.11 or later. Double-click **Start Studio.cmd** for a real classroom installation, or **Start Studio Demo.cmd** for a separate fictional class. The launchers install missing dependencies and rebuild the app. Open **http://127.0.0.1:4185**. Keep the launcher open; Ctrl+C stops the server.

Terminal alternative: `npm ci`, then `npm start`. For the demo, use `npm run demo`.

Demo teacher: `teacher` / `teach-stars-26`. Demo students: `DEMO-alex` or `DEMO-maya` / `create-stars-26`. The demo is computer-only and cannot be enabled through the Vercel entrypoint.

The first normal start writes a private code to **.local/teacher-setup.txt**. Choose **Teacher? Set up this studio** on the login page and use that code to create your teacher login. The code stays the same across restarts until setup is complete, unless you set `STUDIO_SETUP_TOKEN` yourself. The file is excluded from Git.

If you forget your teacher login, open **Reset Teacher Login.cmd**. It lists local teacher usernames, lets you enter a new password privately, saves a database backup and signs that teacher out on other sessions. Classes, student accounts, websites and saved key mappings are retained. It resets local accounts only.

Use **Settings → Classrooms** to create classes and student logins. Normal work is saved in `.local/classroom.sqlite`; demonstration work in `.local/demo.sqlite`. Back up `.local/` while the server is stopped. Earlier prototype databases and the earlier hosted review site are preserved; they are not automatically imported.

## Optional HeyOtto setup

Copy `.env.example` to `.env` and enter server settings privately. `npm start` and the launchers load it. `SUPABASE_URL` and `SUPABASE_SECRET_KEY` use the existing server-only Vault RPCs (`oracle_save_key`, `oracle_read_key`). The model defaults to `heyotto-code`; enable Coding tools for the keys used with it. Teacher key entry remains **Settings → Classrooms → Edit account**. Pasting and manual editing work without this connection. Never upload `.env` or paste secrets into chat.

Publishing locally makes a page live on this local server, not on the public internet. Localhost is device-specific: an iPad cannot reach this PC using its own `127.0.0.1`. A later multi-device pilot needs local-network hosting with appropriate HTTPS, or the hosted deployment.

## GitHub and Vercel

Use [GITHUB-AND-VERCEL.md](GITHUB-AND-VERCEL.md) for the current instructions. Web HQ is being prepared as a subfolder of the existing AI Adventure tools repository, mounted at `/web-hq/` on the existing Vercel project. The clean upload includes reviewed root integration files. Keep the existing Vercel Root Directory unchanged. Transfer local data separately using the migration commands in that guide.

## Learning through code review

API suggestions and imported/pasted code both open a review before changing the draft. Added and removed lines are highlighted, with before/after line numbers and word-level highlights. The review explains coding concepts, identifies starting-state/text changes where possible, offers an optional test and suggests a small manual edit. Students apply changes directly after reviewing; no prediction form, checkbox or follow-up form is required.

HeyOtto is asked for explanations in the same request as the code. Only explanations quoting snippets present in the original/proposed source are attached to matching changes. The code comparison and local explanations still work if HeyOtto omits or malforms that extra information, and for ordinary pasted code. Explanations remain ideas for students to verify in the preview; they do not certify the program's behaviour.

Published visits use the whole browser viewport. A small top-left Class websites button remains outside the isolated student page. This does not hide the browser's address bar or enter the device's native fullscreen mode.

Class selection is reset and revalidated when signing in as a different account. Connecting a HeyOtto key is not required to browse, paste, edit or publish. Each login keeps its own key mapping even if a key is accidentally reused. Replacing a key does not change class membership or another account's mapping.

## Images, video and fullscreen preview

The editor's **Media** button uploads real PNG/JPG/GIF/WebP images (up to 2 MB) and MP4/WebM video clips (up to 3 MB). A site can hold 20 files and 20 MB total. Files are saved in the local classroom database and retained across restarts. Published pages resolve uploaded media only after verifying class membership; classmates cannot load files used only in private drafts.

Choose **Insert code** to insert an image/video element at your JSX cursor, or **Ask HeyOtto** to prepare a request containing the exact uploaded-file reference. Describe where the media should go before sending. HeyOtto receives filenames and references, not image pixels. The server rejects a proposal that omits an explicitly supplied upload reference. This prevents an omitted file from being silently accepted as an invented SVG replacement, but students should still inspect the preview.

**Use an online image or video URL** accepts direct HTTPS media addresses. Images can use actual image-file URLs; video uses direct MP4/WebM file addresses. Search-result pages, YouTube watch pages and arbitrary iframe players are not supported. Host restrictions and school filtering may prevent hotlinking, so downloading a permitted file and uploading it is often more reliable. Larger video clips can use an externally hosted direct video URL. MP4 is the recommended iPad format, subject to supported codec encoding.

Uploaded references such as `studio-media:<id>` are studio-specific. When exporting to a separate standalone project, download/rehost the media and replace these references with your own file paths. For future Vercel hosting, the updated `database/supabase-studio.sql` also creates `studio.media`; existing hosted installations must apply that new table before using uploads.

The preview toolbar's expand icon fills the browser viewport without leaving the editor. Use the collapse icon or Escape to return. It preserves unsaved code. This is a browser-page fullscreen view, not a request to hide the browser's own address bar.
