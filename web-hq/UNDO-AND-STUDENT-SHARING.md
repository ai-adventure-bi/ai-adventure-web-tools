# Undo, redo and student sharing

This update needs no new SQL or environment settings if migrations 010–012 are already applied.

Undo and Redo are always visible in the editor toolbar. They restore draft code, CSS, code type, title and description, including applied HeyOtto/import changes. Nearby typing is grouped into one undo step. History survives JSX/CSS tab switches and draft saves, holds up to 80 steps, and resets when reopening/reloading the editor. It does not undo publication approvals, uploads, account changes or sharing settings; saved Version history remains available for older sessions.

Inside the code editor, Ctrl/Cmd+Z uses the same history. Ctrl/Cmd+Shift+Z and Ctrl+Y redo. After undoing, making a new edit clears the redo branch. Undoing a saved edit makes the draft unsaved again; the server's revision and published version are not rolled back.

On Class websites, a student's own published-site cards show “Share with other schools” below Live when the teacher has enabled the school's sharing switch. The choice saves immediately. Students cannot alter classmates' sites or enable sharing while the school's master switch is off. Other-school visibility still requires an approved published version, so ticking does not bypass teacher publication approval.

The student checkbox and existing teacher per-website list control the same sharing choice. Either can change it; the latest saved choice is shown after refreshing. This is not an additional teacher-veto layer per website. Teachers retain the school-wide master switch, their individual website controls, and publication approval. Switching the school off hides all its sites from other schools.

The combined archive now includes this update and all earlier outstanding changes. Upload its web-hq folder at the GitHub repository root and let Vercel rebuild. If you already ran SQL 010, 011 and 012 successfully, do not run more SQL for this addition.

Validation: production build and 63 automated tests passed. Local fictional browser checks confirmed button/keyboard undo and redo, history across JSX/CSS tabs, and a student checkbox persisting after reload. Hosted deployment and physical iPads remain unverified.
