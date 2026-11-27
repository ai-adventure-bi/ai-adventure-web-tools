-- Combined Web HQ upgrade: selected sharing, private game saves and teacher publication review.
-- No website/account/Sundial data is deleted. Safe to re-run.
BEGIN;

-- 010-selected-site-sharing

-- Existing sites require explicit selection before other schools can visit them.
ALTER TABLE studio.projects ADD COLUMN IF NOT EXISTS share_external integer NOT NULL DEFAULT 0;


-- 011-account-game-saves

CREATE TABLE IF NOT EXISTS studio.game_saves (project_id text NOT NULL,user_id text NOT NULL,state text NOT NULL,revision integer NOT NULL DEFAULT 1,updated bigint NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS game_save_player ON studio.game_saves(project_id,user_id);
ALTER TABLE studio.game_saves ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON studio.game_saves FROM public,anon,authenticated;


-- 012-teacher-publication-review

ALTER TABLE studio.projects ADD COLUMN IF NOT EXISTS pending_review_id text;
ALTER TABLE studio.projects ADD COLUMN IF NOT EXISTS media_revision integer NOT NULL DEFAULT 0;
ALTER TABLE studio.media ADD COLUMN IF NOT EXISTS approved integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS studio.publish_reviews (id text PRIMARY KEY NOT NULL,project_id text NOT NULL,version_id text NOT NULL,requested_by text NOT NULL,created bigint NOT NULL,status text NOT NULL DEFAULT 'pending',reviewed_by text,reviewed_at bigint,note text NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS publish_review_queue ON studio.publish_reviews(status,created);
ALTER TABLE studio.publish_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON studio.publish_reviews FROM public,anon,authenticated;


COMMIT;
