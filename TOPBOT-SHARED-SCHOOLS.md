# TopBot shared schools

TopBot uses Supabase through the existing Vercel project. The bottom Admin button verifies the Admin code and starts a signed, 12-hour session. All Print Room requests require that session. The top HeyOtto Access control and api/design.mjs remain unchanged.

Required server environment variables, configured separately in Production and Preview:

- SUPABASE_URL: the project base URL.
- SUPABASE_SECRET_KEY: a Supabase server secret key, or legacy service_role key.
- TOPBOT_ADMIN_CODE: the private admin access code.
- TOPBOT_SESSION_SECRET: a separate random secret of at least 32 characters.

The user has already run database/001_topbot.sql successfully in the connected Supabase project. Do not rerun it during this deployment. There is no browser-storage migration or seed data.

Schools can be added, archived and restored in the existing Print Room. Archiving stops new submissions and retains the school's code and tops. The school total counts active schools only. Refresh retrieves current shared records. The former pastel filament is labelled Glow in the dark rainbow; stored identifiers remain compatible with existing recipes.

The static build now includes TopBot's vendor and examples folders. Server code, credentials and SQL are not copied to the public static output.

Local checks:

```
node tests/topbot/connection.test.mjs
node tests/topbot/shared.test.mjs
```

These checks use a simulated Supabase REST service. Browser tests also use Playwright and Edge: set TOPBOT_BROWSER_TEST_MODULE=./browser.test.mjs and rerun shared.test.mjs. The user has separately confirmed the real Supabase workflow locally. Existing geometry and mutation tests pass; the older HeyOtto test's prompt-phrase assertion fails in the original and updated versions.

After deployment, verify that /topbot/ loads its 3D preview; Admin login works; the shared school list appears; archive/restore works; and another browser's submission appears after Refresh. Preserve production data while checking. Secrets must remain in server environment variables.
