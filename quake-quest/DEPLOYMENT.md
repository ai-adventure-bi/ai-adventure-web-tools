# Quake Quest: GitHub and Vercel

## What is ready
The frontend builds to `static-dist`. Vercel serves it at `/quake-quest/`.
All frontend API calls use `/api/quake-quest/…`, leaving the existing hub's APIs alone.
`api/quake-quest/[...route].mjs` forwards only known Quake Quest routes to the Python service.
No personal HeyOtto key belongs in GitHub or Vercel environment settings: users connect in the app.

## Required backend
This version uses ObsPy for live waveform processing and keeps HeyOtto sessions and background jobs in memory. It cannot run as a static site or as independent, stateless Vercel Python requests.
Deploy the included Dockerfile to a persistent container host, with repository root as its build context. Use one running instance, no scale-to-zero, and HTTPS. Restarts clear sessions and pending AI rounds; users must reconnect. Multiple replicas require shared session/job storage before they are supported.
Set `QUAKE_PROXY_TOKEN` to a long randomly generated secret on both the backend and Vercel. Set `HEYOTTO_SECURE_COOKIE=1` on the backend (Docker default). The backend uses port 8080 or the host's PORT setting.
Set `QUAKE_BACKEND_URL` on Vercel to the backend's HTTPS origin. Do not include credentials or a path in this URL.
The backend needs outbound access to BGS/EIDA, Overpass and HeyOtto. The browser also loads OpenStreetMap tiles. No recordings or API keys are committed. The server's reference.json contains classroom reference picks and must never be copied into public/.

## Deploy as its own repository
1. Commit the source folder using the included .gitignore. Use `node scripts/package-github.mjs` to create a clean source-only copy under outputs/github-ready if copying through GitHub's upload UI.
2. Deploy that repository to Vercel, with framework preset Other and repository root as Root Directory. The included vercel.json builds `_site`, exposes the gateway, and redirects `/` to `/quake-quest/`.
3. Configure the two Vercel environment values above, then deploy. Use Node 22 or newer and a function duration allowance of 300 seconds. The gateway has its own 240-second upstream timeout.
4. Verify the public page, Explore Stations, a complete solve/reveal round, and optional HeyOtto connection. Do not rely on the local offline fixture as a live-service test.

## Update the existing ai-adventure-web-tools repository
Inspected the current main branch's root package.json, vercel.json and scripts/assemble-vercel-site.mjs. Its build already builds quake-quest/static-dist and copies that into _site/quake-quest.
1. Replace the source inside its `quake-quest/` directory with this prepared source copy. Preserve the hub's root package.json and assembly script. Its existing snapshot update command can stay.
2. Copy this folder's `api/quake-quest/` directory into the repository ROOT `api/quake-quest/` directory. Nested project APIs are not deployed by the root Vercel project.
3. Add `"api/quake-quest/[...route].mjs": { "maxDuration": 300 }` to the ROOT vercel.json functions object. Preserve its existing outputDirectory, build command, headers and all other function entries. No root catch-all rewrite is needed.
4. Set the two environment values in that existing Vercel project. Deploy the backend using `quake-quest/` as Docker build context (or configure its Root Directory accordingly).
5. Deploy the hub normally and test `/quake-quest/`. Do not replace the hub's root vercel.json with this folder's standalone config.

## Editing the UI colour
Change `--ui-colour` on the :root line at the top of app/spy-console.css. It is a six-digit RGB hex. For local use, close the server and reopen Start Quake Quest.cmd: the launcher rebuilds automatically. Alternatively run `npm run build` while the server is running, then refresh the browser. Published versions require a new deployment. The .map-stage override intentionally retains the map window's original palette. Signal colours (P/S, warnings, stations, AI) remain distinct.

## Last-hour amplitudes
Explore Stations uses a fixed ±100,000 digital-count scale, set by EXPLORER_FULL_SCALE_COUNTS in app/live-waveform.tsx. Only the mean is removed. Horizontal min/max bins preserve peaks; there is no per-recording vertical normalisation or amplitude compression. Values beyond the frame are visually clipped. Instrument response has not been removed, so these are not physical displacement units and different instruments need not have equivalent sensitivity.

## Validation and limits
Run the TypeScript check, Vite production build and integration-tests/heyotto-check.py locally. The browser/HTTP fixture tests use synthetic data and a fake provider, not a paid HeyOtto call. Docker and public Vercel deployment must be verified on the target host. No live deployment or GitHub push is performed by these preparation steps.

## Local setup on a new computer
Install Node 22+ and Python 3.12. Run `npm ci`, `npm run build`, `python -m venv .quake-venv`, and `.quake-venv\Scripts\python -m pip install -r server/requirements.txt` on Windows. Launch Start Quake Quest.cmd and open http://127.0.0.1:8766. Linux/macOS: use `.quake-venv/bin/python server/quake_api.py`.
