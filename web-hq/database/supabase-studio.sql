-- Future Vercel setup. New tables; existing Sundial data is untouched.
begin;
create schema if not exists studio;
revoke all on schema studio from public, anon, authenticated;
create table if not exists studio.classes (id text primary key,name text not null,slug text not null unique,teacher text not null,created bigint not null);
create table if not exists studio.users (id text primary key,username text not null unique,name text not null,password text not null,role text not null,class_id text,permanent_id text not null unique,vault_id text not null,key_saved integer not null default 0,disabled integer not null default 0);
drop index if exists studio.studio_one_bootstrap_admin;
create table if not exists studio.sessions (token text primary key,user_id text not null,expires bigint not null);
create table if not exists studio.projects (id text primary key,owner text not null,class_id text not null,slug text not null,title text not null,description text not null default '',source text not null,css text not null default '',kind text not null default 'jsx',revision integer not null default 0,updated bigint not null,published_id text,colour text not null default 'lavender',unique(class_id,slug));
create table if not exists studio.versions (id text primary key,project_id text not null,source text not null,css text not null,kind text not null,title text not null,description text not null,revision integer not null,created bigint not null,label text not null,published integer not null default 0);
create table if not exists studio.limits (key text primary key,count integer not null,expires bigint not null);
alter table studio.classes enable row level security;
alter table studio.users enable row level security;
alter table studio.sessions enable row level security;
alter table studio.projects enable row level security;
alter table studio.versions enable row level security;
alter table studio.limits enable row level security;
revoke all on all tables in schema studio from public, anon, authenticated;
create table if not exists studio.media (id text primary key,project_id text not null,name text not null,mime text not null,size integer not null,data_url text not null,created bigint not null);
alter table studio.media enable row level security;
revoke all on studio.media from public, anon, authenticated;

drop index if exists studio.studio_one_bootstrap_admin;
create table if not exists studio.schools (id text primary key,name text not null,slug text not null unique,description text not null default '',shared integer not null default 0,created bigint not null);
alter table studio.classes add column if not exists school_id text;
alter table studio.schools enable row level security;
revoke all on studio.schools from public, anon, authenticated;



create table if not exists studio.class_teachers (class_id text not null,user_id text not null,unique(class_id,user_id));
insert into studio.class_teachers(class_id,user_id) select id,teacher from studio.classes on conflict do nothing;
alter table studio.class_teachers enable row level security;
revoke all on studio.class_teachers from public, anon, authenticated;



create table if not exists studio.addresses (class_id text not null,slug text not null,project_id text not null,unique(class_id,slug));
create table if not exists studio.boards (project_id text primary key,enabled integer not null default 0);
create table if not exists studio.scores (id text primary key,project_id text not null,name text not null,score bigint not null,created bigint not null);
insert into studio.addresses(class_id,slug,project_id) select class_id,slug,id from studio.projects on conflict do nothing;
alter table studio.addresses enable row level security;
alter table studio.boards enable row level security;
alter table studio.scores enable row level security;
revoke all on studio.addresses,studio.boards,studio.scores from public,anon,authenticated;



alter table studio.versions add column if not exists origin text not null default '';
alter table studio.versions add column if not exists before_source text not null default '';
alter table studio.versions add column if not exists teaching text not null default '[]';
alter table studio.versions add column if not exists request text not null default '';
create table if not exists studio.questions (id text primary key,project_id text not null,question text not null,answer text not null,created bigint not null);
alter table studio.questions enable row level security;
revoke all on studio.questions from public,anon,authenticated;


alter table studio.projects add column if not exists trashed integer not null default 0;


do $$
begin
 if not exists(select 1 from information_schema.columns where table_schema='studio' and table_name='classes' and column_name='shared') then
  alter table studio.classes add column shared integer not null default 0;
  update studio.classes c set shared=coalesce((select s.shared from studio.schools s where s.id=c.school_id),0);
 end if;
 if not exists(select 1 from information_schema.columns where table_schema='studio' and table_name='classes' and column_name='description') then
  alter table studio.classes add column description text not null default '';
  update studio.classes c set description=coalesce((select s.description from studio.schools s where s.id=c.school_id),'');
 end if;
end $$;

DO $$ BEGIN
 IF EXISTS(SELECT lower(permanent_id) FROM studio.users WHERE role='student' GROUP BY lower(permanent_id) HAVING count(*)>1)
 OR EXISTS(SELECT 1 FROM studio.users s JOIN studio.users t ON lower(s.permanent_id)=lower(t.username) WHERE s.role='student' AND t.role<>'student') THEN
  RAISE EXCEPTION 'Student permanent IDs collide with another login. Resolve the collision before migrating.';
 END IF;
END $$;
UPDATE studio.users SET username='~student-login~'||id WHERE role='student';
UPDATE studio.users SET username=lower(permanent_id) WHERE role='student';

ALTER TABLE studio.versions ADD COLUMN IF NOT EXISTS thumbnail text NOT NULL DEFAULT '';
commit;
