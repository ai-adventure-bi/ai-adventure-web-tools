# Add Web HQ to the existing tools hub

Target repository: https://github.com/ai-adventure-bi/ai-adventure-web-tools

Target page: https://ai-adventure-web-tools.vercel.app/web-hq/

The prepared `github-upload` folder is an **overlay** for that repository. Copy its contents into your current checkout, keeping all the other tools. Do not replace the repository with this app folder or change the existing Vercel Root Directory. The overlay adds a Web HQ card to the hub, the `web-hq/` app, `api/web-hq.mjs`, and matching root build/routing settings. It retains the existing Quake Quest and 3D Lab build commands and function configuration. `UPLOAD-CONTENTS.json` records the repository commit used to prepare the edited root files; review differences if the hub has changed since then.

## 1. Set up the online database

In the same Supabase project that already holds the HeyOtto keys, run **web-hq/database/supabase-studio.sql** in the SQL editor. This creates the private `studio` schema. It does not move local classroom data or change Sundial's tables or Vault mappings.

From Supabase's **Connect** panel, copy the **transaction pooler** Postgres connection string and supply the database password privately. This is different from the Supabase API key. Add it to the original local app's ignored `.env` as `WEB_HQ_DATABASE_URL`. Never put this value into GitHub, student code or chat.

## 2. Transfer your existing accounts and work

Use the **original local working folder**, which contains `.local/classroom.sqlite`, not the clean upload folder. Keep using the same Supabase project so the existing Vault references resolve.

First, save everyone's work and stop the local launcher. Run these commands in the original app folder:

```powershell
npm run migration:check
npm run migration:apply
```

The first command checks the local data and empty destination without changing online data. The second creates a private local backup and imports the data in one transaction. It refuses to overwrite an occupied destination. It preserves account IDs, existing password hashes, student permanent-ID logins, teachers, class sharing, site addresses and aliases, drafts, published versions, trash, images/video, history, questions and leaderboard scores. Sessions and temporary rate limits are not transferred, so everyone signs in again online. No raw HeyOtto keys are exported; existing Vault references are retained. A failed import rolls back its database changes.

Do not create new hosted accounts before this transfer. Keep the local backup after moving online; avoid using both installations for separate new edits after the final transfer. Run `npm run migration:summary` for local counts only, without connecting online.

## 3. Add server settings to the existing Vercel project

Use **Settings → Environment Variables** on the existing `ai-adventure-web-tools` Vercel project. The shared-hub adapter deliberately uses Web HQ-specific names so it does not change the other tools' connections:

| Variable | Value |
| --- | --- |
| `WEB_HQ_DATABASE_URL` | Supabase transaction-pooler connection string |
| `WEB_HQ_SUPABASE_URL` | Same Supabase project URL used locally |
| `WEB_HQ_SUPABASE_SECRET_KEY` | Same server-only Supabase secret/service-role key used locally |
| `WEB_HQ_HEYOTTO_MODEL` | `heyotto-code` |
| `WEB_HQ_HEYOTTO_TIMEOUT_MS` | `180000` (optional; this is the default) |
| `WEB_HQ_HEYOTTO_APP_ID` | Optional, if already used locally |

If importing existing accounts, no setup token is needed. For a deliberately empty installation only, set a random `WEB_HQ_SETUP_TOKEN` for creating the first admin, then remove it and redeploy after setup.

Scope production credentials to **Production**. Preview deployments should use a separate test database and test credentials; a preview without a database reports that configuration is required. Do not enable demo accounts online. Keep these variables server-only, with no `VITE_`, `NEXT_PUBLIC_` or similar prefix.

## 4. Upload and deploy

1. Copy **the contents** of `github-upload` into the repository root. This includes the `web-hq` directory and the updated root `package.json`, `vercel.json`, `index.html`, `scripts/assemble-vercel-site.mjs`, plus `api/web-hq.mjs` and the new check workflow. Preserve every other file.
2. Review the diff, then commit and push using your normal GitHub workflow. The prepared package contains no `.env`, Git history, local databases, backups, dependencies, generated builds or classroom data.
3. Keep the existing Vercel project and repository Root Directory unchanged. Its root build now builds Web HQ before running the existing tools build. The new function allows up to 300 seconds; HeyOtto's own limit is 180 seconds. Enable Fluid compute if your existing project needs it for that duration.
4. Open the hub and choose **Web HQ**. The app lives at `/web-hq/`; its API, assets, sandbox, cookies and published links stay under that prefix.

The source package is prepared locally; this process has not pushed to GitHub, changed Supabase tables or deployed Vercel automatically.

## 5. Check the live result

Sign in using the existing admin account, check class membership and a student's draft, and open a published site with uploaded media. Test a small HeyOtto question, review/apply a change, save/publish, copy a classmate's code, and submit a test leaderboard score if one is enabled. Check the other tools still open. Finally try on a physical iPad.

Media remains stored in Supabase Postgres (`studio.media`), not in Vercel's temporary filesystem. The app keeps uploads below the ordinary 4.5 MB function request limit by limiting raw image/video sizes and the JSON body. Very long AI requests can still fail at a provider or hosting limit; the app retains the draft and does not automatically retry paid requests.

References: [Vercel function duration and payload limits](https://vercel.com/docs/functions/limitations), [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
