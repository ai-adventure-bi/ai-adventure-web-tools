# HeyOtto investigator integration

The normal launcher remains **Start Quake Quest.cmd**. Close and restart that server after this update, then refresh the browser. A refresh alone will not load the new Python API routes.

## Using it

1. Choose **Connect HeyOtto** in the launch dialog and enter your personal consumer API key from HeyOtto settings. Or choose **Continue without HeyOtto**.
2. Investigate as before. HeyOtto automatically analyses the initial three stations independently; increasing to six does not change its input or restart its analysis.
3. **Lock answer & reveal earthquake** freezes your location and picks. If HeyOtto is still running, wait up to 30 seconds or choose to proceed without it.
4. Compare the map predictions and kilometre errors. Use **Compare arrivals in the AI’s one-minute window** to see dashed violet AI picks beside your picks. Pan and zoom still work; submitted picks remain locked.
5. Reconnect/disconnect through **HeyOtto connection**. Reconnecting after an investigation has started takes effect on the next case; it cannot reroll a completed AI prediction.

## Provider contract

Implemented against the HeyOtto Passport OpenAPI 0.1.0 specification supplied on 16 October 2026:

- `GET https://api.chat.heyotto.app/v1/models` verifies the key and model access.
- `POST https://api.chat.heyotto.app/v1/chat/completions` sends a non-streaming request, using `Authorization: Bearer <personal key>`.
- Default model: `heyotto`. No account/login endpoint appears in the supplied spec; this is API authentication, not a browser account login.
- The API explicitly rejects `system` messages and `response_format`. The complete successful instructions from the attachment are retained in `server/heyotto_prompt.txt` and sent as a **user** message followed by newly generated DATA. No example waveform data is hardcoded.
- Each attempt omits `conversation_id` to avoid inheriting previous rounds. HeyOtto creates/stores API conversations; account holders may be able to inspect these through HeyOtto itself. Quake Quest seals results in its own server, but cannot enforce secrecy in the user's external provider account.
- Output is validated locally. One retry is allowed for invalid JSON/schema/picks, with only a validation error and the same blind input. Service/authentication/rate-limit failures do not trigger repeated paid calls.

Optional server environment variables (set before launching):

| Variable | Default | Purpose |
|---|---|---|
| `HEYOTTO_MODEL` | `heyotto` | A model ID available to the key, verified through `/v1/models`. |
| `HEYOTTO_APP_ID` | omitted | Passport app public ID; omission uses the organisation default. |
| `HEYOTTO_SECURE_COOKIE` | unset | Set `1` when deployed behind HTTPS. |

No shared API key is required or embedded. Personal keys pass once from the dialog to the same-origin Python server, then are held only in server memory. An opaque HttpOnly, SameSite=Strict session cookie identifies that session. Disconnect removes credentials and cancels unpublished results. Sessions expire after two hours without API activity or on server restart. Browser localStorage/sessionStorage do not hold credentials. Use localhost for the local HTTP launcher; network hosting must use HTTPS with Secure cookies and a reverse proxy to the Python server. This feature requires that server and does not work on a static-only host.

## Numerical and round behaviour

- Uses the existing BGS `waveform()` loader, channels, filters and recording-relative timeline. Overview data from all three stations chooses a joint region through robust sustained energy; fine data refines the shared 60-second window. No catalogue time, reference phase, student answer or geographical distance is used in window selection.
- Each request has exactly 240 timestamp/amplitude pairs per station, 0.25 seconds per bin. Peak absolute amplitude is normalised once per station, with a maximum of 1000. Incomplete bins are null. Source min/max bins can straddle an export boundary, so their peak is conservatively carried into both overlapping bins.
- This is automatic signal-region selection, not proof that the selected signal is the catalogue earthquake. Multiple disturbances, quiet events or long arrival spreads can defeat it. Missing coverage fails safely; a truncated event is flagged. Amplitude envelopes lose polarity and frequency; phase labels remain model estimates.
- `app/seismic-model.json` is the shared mathematical specification for student/AI distance conversion: P=6 km/s, S=3.5 km/s, maximum accepted delay=120 seconds. Both use `(S-P)/(1/Vs-1/Vp)`.
- The prior student workflow had **no automatic triangulator**: students placed a map pin against their rings. The new AI solver minimises the squared great-circle radius errors from three valid P/S pairs, with multiple starting positions. It never fits to the actual answer. Ambiguous solutions and ring-fit RMS are reported. Fewer than three pairs means no AI map location.
- AI status endpoints never contain private picks, windows or coordinates. Submission locks the student's snapshot on the server before the prediction can be read. Results, including skipped/unavailable results, are fixed for that round. Requests and late responses are isolated by unique round IDs.
- Scoring still uses only the student's distance from the BGS epicentre. AI performance does not affect ranks or points.
- To keep the original three stations stable when expanding, additional stations are appended after that initial group.

## Validation

- `integration-tests/heyotto-check.py`: window choice, bin counts and timeline, 79:54 timing regression, null/scaling, exact prompt preservation, strict JSON validation, shared mathematics, geographic fitting, sealed results, immutable submissions, retries, timeout/skip and documented request construction.
- Archived BGS EDMD/AQ12/KESW recordings selected a shared 4492.75–4552.75 second window, producing 240 bins for each station, without reference timing as input.
- `integration-tests/heyotto-fixture.py` is an explicitly offline test server on port 8767, with synthetic recordings and a fake provider. It is never loaded by the production launcher.
- `integration-tests/heyotto-http.py` checks cookies, cross-origin rejection, status secrecy, submission immutability and reveal/disconnect against that fixture.
- `integration-tests/heyotto-browser.mjs` checks solo launch, invalid/valid fixture authentication, six-station expansion, hidden predictions, map reveal, three waveform overlays, reset, waiting/skip and late-response rejection. Desktop/mobile screenshots are in the test directory.
- TypeScript checking and production build were run.

**Not live-validated:** a successful completion using a real HeyOtto key, live provider latency/quotas, and picking accuracy across the current BGS catalogue. No real key was available during implementation. Offline tests verify integration mechanics; they do not establish seismic picking accuracy.
