begin;
alter table studio.projects add column if not exists trashed integer not null default 0;
commit;
