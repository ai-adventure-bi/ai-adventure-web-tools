# 3D Lab

Independent student image-to-3D workshop at `/3d-lab/`, with its own Admin / Print Room.

Keep this folder inside ai-adventure-web-tools. It imports existing root server helpers and classroom records; it is not a standalone GitHub Pages app. No TopBot interface is modified.

## Local development
Use Node 22.13 or later. From this folder: `npm ci`, `npm test`, `npm start`. Copy `.env.example` to `.env` and supply existing server settings locally. Open http://127.0.0.1:4174/.

## Build
`npm run build` writes only approved browser assets to `dist`. The root Vercel build copies them to `_site/3d-lab`. `/api/3d-lab` handles private storage, teacher access and provider calls.

## Database
Reuse the existing Supabase project. Fresh installation order: root database/001_topbot.sql, lab/002_lab.sql, lab/003_classrooms.sql. Do not rerun 002 on an existing installation: it creates tables and policies. Deployment does not move or reset projects.

## Current workflow
HeyOtto generation and follow-up edits, or direct upload; teacher image approval; four-view generation and preview; model generation; teacher edit/release; student sculpting and saving; Print Room submission and STL export. New project and teacher codes are case-insensitive six-character codes. Teacher access is classroom-scoped. Owner access uses the existing server admin code.

## Limits
Conversation history is tab-local and lost on refresh. Paid image deduplication is in-process, not durable across Vercel instances; never automatically retry uncertain paid requests. Tripo reservations are stored in the database. Teacher review is required; geometry checks do not guarantee printability. See GO-LIVE.md at the repository root.
