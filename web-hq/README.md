# Web HQ

Students build websites and games using real JSX or HTML, manual editing and HeyOtto help. Classes have published galleries; drafts and trash stay in each person's My websites. Students can view and copy published code, but edit only their own work. Teachers manage assigned school classrooms; admins manage all classrooms.

## Run locally

Install Node.js 22.11 or later. Open **Start Studio.cmd**, or run `npm ci` followed by `npm start`. Open http://127.0.0.1:4185. Local data is in the ignored `.local/classroom.sqlite` file. **Start Studio Demo.cmd** uses a separate fictional database: student `DEMO-alex` / `create-stars-26`, teacher `teacher` / `teach-stars-26`.

## Move to the existing GitHub/Vercel tools hub

Follow [GITHUB-AND-VERCEL.md](GITHUB-AND-VERCEL.md). The clean upload adds `web-hq/` and matching root integration files to https://github.com/ai-adventure-bi/ai-adventure-web-tools. The target page is https://ai-adventure-web-tools.vercel.app/web-hq/. Preserve the hub's other tools and its root build configuration.

The hosted backend uses private Supabase Postgres tables; HeyOtto keys stay in the existing Supabase Vault RPC store. No local database, secrets or student work belongs in the GitHub upload. The one-time transfer commands preserve existing accounts, password hashes, ownership, drafts, publications, uploads, history, aliases and leaderboard scores. Sessions are not transferred.

## Guides

- [Local setup](LOCAL-SETUP.md)
- [GitHub upload, database transfer and Vercel settings](GITHUB-AND-VERCEL.md)
- [Accounts and key storage](ACCOUNT-AND-KEYS.md)
- [Teachers, classrooms and sharing](STAFF-AND-SCHOOLS.md)
- [Code review and questions](HEYOTTO-LEARNING.md)
- [Game support](GAMES.md)
- [Leaderboards and links](LEADERBOARDS-AND-LINKS.md)
- [Trash and source sharing](TRASH-AND-SHARING.md)

## Checks and hosting boundaries

Run `npm run build` and `npm test`. The Vercel entrypoint is `api/index.mjs`; the shared-hub wrapper mounts it at `/web-hq`. Cookie, asset, API, sandbox and navigation paths adapt to that mount. Student code runs in a sandboxed iframe, without studio cookie access or arbitrary network requests. Online saving for leaderboards uses the built-in, restricted server bridge.

The prepared upload is source/configuration only. Live Postgres import, Vercel deployment, hosted HeyOtto requests and physical iPad testing are separate checks. Never expose the local demo's known passwords online.
