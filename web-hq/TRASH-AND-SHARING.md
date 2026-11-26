# Website lists, trash and shared source

Restart `Start Studio.cmd` and refresh after updating. The local migration adds a trash flag without moving or deleting existing projects.

**Class websites** contains published websites only, including for the site's owner. It uses published titles/descriptions and source snapshots, so newer private edits do not appear. **My websites** lists the signed-in person's own published sites and drafts across their classrooms. The **Trash** button opens that person's recoverable trash.

**Move to trash** takes a site offline immediately. Its published address, aliases, community listing and public leaderboard become unavailable. Code, media, versions, explanations, answers, leaderboard scores and reserved addresses remain stored. Restoring returns the site to a private draft; publishing again is a separate choice. No permanent deletion control is added. Only active websites count toward the existing 12-site limit; restoration requires an available active slot.

Teachers and admins have a **Students** page. Choose a classroom, then a student, to see their published sites, drafts and trash. Teachers are restricted to assigned classrooms; admins can inspect all students. These lists offer read-only code inspection, website preview, trash and restore controls. Existing authorised staff editing permissions are unchanged. Students cannot inspect, edit, trash or restore another student's private projects.

Published gallery cards have **View / copy code**. Visiting a website displays its content without floating Studio buttons; use the browser’s Back button to return. The viewer shows the published JSX/HTML and CSS, supports copying, and cannot edit the original. Private draft and trash code remains limited to the owner and authorised staff. Copied source can be pasted into a student's own project; referenced media still belongs to the original project, so copying code does not duplicate its media files.

Existing hosted databases must run `database/006-website-trash.sql` after the earlier numbered upgrades before deploying this version. The full `database/supabase-studio.sql` includes it for fresh installations. This update was tested locally; the hosted migration has not been run against a live Supabase deployment.

## Permanent deletion and reusable addresses

Trash rows offer **Delete permanently**, followed by a confirmation explaining that deletion cannot be undone. The owner, an assigned teacher or an admin may delete a trashed website. It removes the project, uploads, saved versions and thumbnails, questions, leaderboard scores and board, and all current/old address reservations in one database transaction. Other websites are preserved. A website restored before the deletion transaction is protected. Deleted addresses can be used by new websites; old links may consequently lead to another site later.

New website addresses use the title directly, with a readable number only when an address is already taken (for example, `my-game`, then `my-game-2`). Trash reserves addresses until permanent deletion. Existing website addresses do not change automatically. No new database columns or SQL migration are needed for this update.
