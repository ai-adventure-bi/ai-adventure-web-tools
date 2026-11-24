begin;
alter table studio.versions add column if not exists origin text not null default '';
alter table studio.versions add column if not exists before_source text not null default '';
alter table studio.versions add column if not exists teaching text not null default '[]';
alter table studio.versions add column if not exists request text not null default '';
create table if not exists studio.questions (id text primary key,project_id text not null,question text not null,answer text not null,created bigint not null);
alter table studio.questions enable row level security;
revoke all on studio.questions from public,anon,authenticated;
commit;
