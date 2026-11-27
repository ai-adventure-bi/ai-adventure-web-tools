CREATE TABLE game_saves (project_id text NOT NULL,user_id text NOT NULL,state text NOT NULL,revision integer NOT NULL DEFAULT 1,updated integer NOT NULL);
CREATE UNIQUE INDEX game_save_player ON game_saves(project_id,user_id);
