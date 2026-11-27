BEGIN;
ALTER TABLE studio.projects ADD COLUMN IF NOT EXISTS pending_review_id text;
ALTER TABLE studio.projects ADD COLUMN IF NOT EXISTS media_revision integer NOT NULL DEFAULT 0;
ALTER TABLE studio.media ADD COLUMN IF NOT EXISTS approved integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS studio.publish_reviews (id text PRIMARY KEY NOT NULL,project_id text NOT NULL,version_id text NOT NULL,requested_by text NOT NULL,created bigint NOT NULL,status text NOT NULL DEFAULT 'pending',reviewed_by text,reviewed_at bigint,note text NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS publish_review_queue ON studio.publish_reviews(status,created);
ALTER TABLE studio.publish_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON studio.publish_reviews FROM public,anon,authenticated;
COMMIT;
