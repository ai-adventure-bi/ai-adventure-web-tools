# HeyOtto changes and questions

Restart `Start Studio.cmd` and refresh after updating. The local database upgrades automatically, preserving existing sites, accounts and history.

## Saved changes and explanations

Every valid code-change reply received by Studio is saved immediately as a **HeyOtto suggestion** in **History**, even if the student does not apply it or click Save draft. It contains the exact proposed file, the original file it was based on, the request, and HeyOtto’s website-specific explanation. The purple summary appears above the comparison independently of exact snippet matching. Matching per-change notes remain alongside their code. If HeyOtto omits an explanation, Studio makes one explanation-only follow-up using the website title, request and actual before/after changes. This may consume an additional HeyOtto request/credits and waits up to 45 seconds. If no usable explanation arrives, Studio rejects the suggestion and leaves the draft unchanged.

Open **Advanced settings**, then use **History → What changed?** to reopen the original highlighted comparison and explanation. **Find in my code** searches the current App.jsx/index.html for that part. If the code has been edited since then, Studio tries an unchanged line from the same change; if nothing remains, it explains that the old code can no longer be found. Historical line numbers refer to the saved suggestion, not necessarily the latest draft.

**Use this version** restores a suggestion as the draft using the existing revision checks. A suggestion is not automatically applied or published merely because it is recorded in History. Saved drafts and published versions remain in the same history list; older entries can be loaded. Explanations cannot be recovered retroactively for replies that were received before this feature stored them. A failed/timed-out request that Studio never received also cannot create a suggestion entry.

## Two send buttons

- **Change my code** asks for replacement code and the learning explanation, then offers the usual review before applying anything.
- **Ask a question** asks for a plain-language explanation. It sends the current code, CSS and any selected code, including unsaved edits, without saving or changing the draft. If the question asks for an edit, HeyOtto is instructed to explain it and point students to Change my code instead.

Answers appear in the HeyOtto panel and recent answers reopen with the project. They refer to the code at the time the question was asked. They are shown as text, never executed or applied as code. The two modes share the existing request allowance and private per-user key connection. Both suggestions and questions are available only to the site owner and authorised classroom staff.

For an existing hosted database, run `database/005-heyotto-history.sql` after the earlier numbered upgrades before deploying this version. Fresh databases can use the full `database/supabase-studio.sql`. Live HeyOtto responses and the hosted migration were not tested in this update; provider calls were mocked in automated checks, and the UI was checked using clearly labelled fictional history.

## Reading answers and editor controls

Advanced settings is a checkbox fixed at the right of the code-window header. The leaderboard information panel is removed; built-in leaderboard instructions and automatic setup still work when students ask HeyOtto for a leaderboard. The request textarea contains the short instructions, rather than repeating them above the answer/review area. Proposed code appears before older answers.

Question answers render simple Markdown as paragraphs, emphasis, lists and code snippets. Existing saved answers benefit from the same formatting. Open answer shows a wider reading window. Raw HTML is not executed, and answer images are not fetched. Question-mode instructions request a brief first explanation unless the student asks for detail.
