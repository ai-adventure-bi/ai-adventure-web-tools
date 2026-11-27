ALTER TABLE projects ADD COLUMN pending_review_id text;
ALTER TABLE projects ADD COLUMN media_revision integer NOT NULL DEFAULT 0;
-- Preserve already-published legacy media; new uploads explicitly start private.
ALTER TABLE media ADD COLUMN approved integer NOT NULL DEFAULT 1;
CREATE TABLE publish_reviews (id text PRIMARY KEY NOT NULL,project_id text NOT NULL,version_id text NOT NULL,requested_by text NOT NULL,created integer NOT NULL,status text NOT NULL DEFAULT 'pending',reviewed_by text,reviewed_at integer,note text NOT NULL DEFAULT '');
CREATE INDEX publish_review_queue ON publish_reviews(status,created);
