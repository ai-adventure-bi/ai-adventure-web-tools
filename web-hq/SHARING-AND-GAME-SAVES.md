# Selected websites and private online progress

## Apply this update to the existing Vercel installation

1. In the existing Supabase project's SQL editor, run `database/010-selected-site-sharing.sql`, then `database/011-account-game-saves.sql`. They add one column and one new table; they do not delete accounts, sites or Sundial data. The scripts are repeatable.
2. Upload the archive's `web-hq/` files into the matching `web-hq/` folder in the existing GitHub repository. Commit and let Vercel rebuild. Do not upload `.env`, `.local` or classroom databases. No new environment variables are required.
3. In Web HQ, open Settings → Classrooms, choose the school, enable “Allow selected websites to be shared with other schools” and save. Tick the agreed websites in the list below, then press “Save sharing choices”.

**Existing websites start unticked**, including sites in schools that already enabled sharing. Their own class can still visit published sites. Re-select any sites that should remain available to other schools. Drafts cannot be visited by other schools. Teachers can preselect a draft, but it becomes accessible only when published. New sites start unticked. Trashing a site clears its selection; restoring it keeps it private until reselected and published. Disabling the school's master switch hides all its sites from other schools while retaining its individual choices.

Only assigned teachers and admins manage these choices. Students cannot change the teacher's selection. Selection means the teacher has confirmed agreement; this is not an automatic consent collection or consent record system. Restrictions apply to gallery results/counts, published code/pages, old address redirects, thumbnails and uploaded media. Existing anonymous leaderboard endpoints retain their deliberately public nickname/score behaviour.

Local installations apply the SQLite migrations when starting the updated app. The hosted scripts above must be run manually before deploying the new code.

## Private online game saves

Each game can store one small progress object per signed-in player. The server obtains the player ID from the secure login session and the website ID from the host's verified iframe bridge. Games do not receive database credentials or choose another player/game's save. Saves live in `studio.game_saves` on Supabase Postgres when hosted, and in the local app's SQLite database when running locally. Camera/media permissions are unchanged.

The game calls:

```js
const saved = await window.SiteStudio.saves.load();
// saved: { data: null | object, revision, updated }
// If data is null, this account has no progress for this game yet.

await window.SiteStudio.saves.save({
  schemaVersion: 1,
  coins: 20,
  inventory: ['watering can'],
  completedQuests: ['meet the gardener']
});
```

Load before allowing play or autosaving. Save plain JSON, at most 128 KiB. Save the game's actual meaningful state, including mutable refs as well as React state. Store a world-generation seed and changes rather than serialising Three.js scenes or meshes. Include a schemaVersion so later code can recognise older saves. Display success only after the save Promise resolves. The SDK serialises calls and handles revision numbers. A conflicting write from another tab/device is rejected; it does not silently overwrite newer progress. After any uncertain write/failure the SDK requires loading again before saving.

Autosave during play, generally after a short pause in changes (about two seconds), and immediately at important checkpoints. Offer a manual Save progress button. Do not save every animation frame or rely on closing the tab to finish asynchronous work. On load failure, show Retry instead of starting autosave with an empty game. On save failure keep the current progress in memory; let the player choose whether to resume the online version before applying a reloaded save over unsaved progress. Repeated writes are limited to 120 per minute per account/game.

Progress follows the player's account on another device connected to this same hosted installation. Renaming a site, publishing updates or changing a display name keeps the same save. Trash retains saves for restoration; permanently deleting the website removes all its players' saves. Code updates that remove or change game features may need to migrate the saved object. Publishing an unrelated replacement game under the same website ID will still find that website's previous data, so check schemaVersion and game identity in the game's own data when appropriate.

A network outage or closing the browser before “Progress saved online” can lose the most recent unsaved changes. This system does not claim offline saving or a guaranteed successful final save on browser exit. Shared leaderboard scores remain separate from private progress.

## Connect an existing game such as Willowbrook

Adding the platform API does not automatically identify every game's inventory, quests, position and other state. Existing games need their code connected once. HeyOtto now receives this save contract in both code-change and question mode. Ask it:

> Add private online progress using Web HQ's built-in SiteStudio.saves API. First identify all meaningful progress in this game, including inventory, quests, unlocks, money, position and world changes. Load it before play, restore both state and refs, autosave changed progress after a short pause, save checkpoints, and add Save progress with clear saving/error messages. Keep my existing game intact. Do not use localStorage or add a database. Do not overwrite online progress when loading fails or silently overwrite a newer save from another tab.

Review the proposed change. In a test account, make progress, wait for successful saving, reload and check each important kind of state. Test a second account to confirm its progress starts separately. If the game has a large or unusual state model, connect the save fields in smaller edits. Willowbrook itself was not changed or provider-tested by this platform update.

## Verification

- Production build and full automated regression suite passed (57 tests).
- Server tests cover private account/game isolation, a new login session, drafts, selected cross-school access, size validation, stale revision conflicts, URL changes, trash/restore and permanent-deletion cleanup.
- SDK tests cover load-before-save, immutable snapshots, serialisation and stopping writes after failure.
- Sharing tests cover default-off migration, teacher/admin scope, selected counts, private direct/old links, thumbnails and referenced media.
- Fictional local browser demonstration: checkbox selection saved; collecting a coin autosaved, reloading restored the same coin with “Online progress loaded”.
- Hosted Supabase SQL, production Vercel, a second physical device, physical iPads and the real Willowbrook game remain unverified. No real student data was used in the browser checks.
