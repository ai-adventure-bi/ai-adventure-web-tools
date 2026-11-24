# Staff and schools

Restart `Start Studio.cmd` and refresh the browser after this update. Local database upgrades run automatically, preserving existing users, sites and HeyOtto connections. The original setup account remains an admin.

1. Sign in as an admin and open **Settings → Staff** to add teachers or additional admins.
2. Use **Edit account** to change display names, change staff usernames and roles, reset another person's password, connect HeyOtto, or disable/enable an account. Student permanent IDs are their fixed logins. Everyone can click their display name in the top bar to change their own display name or password. Changing your own password requires your current password and signs you out. Staff passwords can have any nonempty length up to 100 characters. At least one active admin must remain.
3. Open **Settings → Classrooms** to create or edit a school classroom. One classroom is one school’s club; there is no separate Schools tab or group assignment.
4. Choose a classroom, set its school/club name and description, tick its teachers, then save. Each classroom can have several teachers, selected using checkboxes; each teacher may have several classrooms. Unticking a teacher removes their classroom management access when you save. Teachers can also create classrooms assigned to themselves. Admins assign teachers; teachers can edit their own classroom’s name, description and sharing choice.
5. Tick **Share published websites with other schools** in the classroom settings when ready. **Other schools** shows shared school homepages with live website previews. These pages require a Studio login and include published work only. Each shared classroom appears as its own school homepage, excluding the viewer’s current classroom from Other schools. This connects clubs in the same Studio installation; it does not discover unrelated deployments automatically.

Admins can manage all accounts, classrooms, drafts and published work. Teachers can manage students and websites only in classrooms assigned to them, plus their own staff account. Students edit only their own sites. Community visitors can read shared published pages, not manage accounts or open private drafts. Disabling school sharing removes community access immediately. Published website code can link to another shared website using its `/c/class-address/site-address` path.

## Future Vercel hosting

For an existing Supabase Studio database, run `database/002-staff-community.sql`, followed by `database/003-multiple-teachers.sql`, in its SQL Editor before deploying this version. New installations can use the complete `database/supabase-studio.sql`. This has not been tested against a live hosted database in this update.

Locally, uploaded image/video bytes are encoded in the `media.data_url` column in `.local/classroom.sqlite`. The Vercel adapter uses the equivalent private `studio.media` table in Supabase Postgres. Remote HTTPS image/video links remain hosted by their original provider. Vercel's filesystem is not used for persistent uploads. Current per-file and per-project limits still apply. For larger classes or video libraries, migrate file bytes to private Supabase Storage with metadata and permissions in the database; that migration is not part of this update.

## Student applications with shared data

Shared message boards, polls, guestbooks and game scores are possible, but Studio now provides an optional persistent leaderboard API (see LEADERBOARDS-AND-LINKS.md). It does not yet provide a general shared-data API for message boards or polls. A generated UI alone cannot save messages for other visitors. Browser-only state also does not provide a shared database.

A suitable next feature is a small Studio-provided data library that passes requests through the isolated preview bridge to authenticated server routes. The server would enforce project/class scope, message lengths, rate limits and teacher moderation, and store records in Supabase Postgres online (SQLite locally). Student code must never receive database credentials or service keys. Boards should have teacher controls for enabling posting, hiding messages and closing a board. HeyOtto can build against documented library methods once that feature exists; it cannot add server database access just by generating JSX.

## Classroom = school upgrade

Existing classrooms, accounts, teacher checkboxes, website ownership and /c/... addresses are preserved. The local migration copies any previously configured school sharing/description to its classrooms. Classrooms without an old school assignment remain private until sharing is enabled. Legacy group records are retained internally for migration and old single-class school links; they are no longer a separate setup step.

For an existing hosted database, run database/007-classrooms-are-schools.sql after the earlier upgrades. The full database/supabase-studio.sql includes this change for a fresh installation. No hosted migration or deployment was performed in this update.
