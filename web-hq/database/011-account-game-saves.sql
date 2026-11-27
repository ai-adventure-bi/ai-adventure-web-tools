BEGIN;
CREATE TABLE IF NOT EXISTS studio.game_saves (project_id text NOT NULL,user_id text NOT NULL,state text NOT NULL,revision integer NOT NULL DEFAULT 1,updated bigint NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS game_save_player ON studio.game_saves(project_id,user_id);
ALTER TABLE studio.game_saves ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON studio.game_saves FROM public,anon,authenticated;
COMMIT;
