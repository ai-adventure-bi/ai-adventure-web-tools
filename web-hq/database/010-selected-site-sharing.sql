BEGIN;
-- Existing sites require explicit selection before other schools can visit them.
ALTER TABLE studio.projects ADD COLUMN IF NOT EXISTS share_external integer NOT NULL DEFAULT 0;
COMMIT;
