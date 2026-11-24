-- Run once in Supabase SQL Editor when upgrading an existing Studio database.
begin;
drop index if exists studio.studio_one_bootstrap_admin;
create table if not exists studio.schools (id text primary key,name text not null,slug text not null unique,description text not null default '',shared integer not null default 0,created bigint not null);
alter table studio.classes add column if not exists school_id text;
alter table studio.schools enable row level security;
revoke all on studio.schools from public, anon, authenticated;
commit;
