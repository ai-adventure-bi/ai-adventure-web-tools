-- Existing hosted installations: run after 002-staff-community.sql.
begin;
create table if not exists studio.class_teachers (class_id text not null,user_id text not null,unique(class_id,user_id));
insert into studio.class_teachers(class_id,user_id) select id,teacher from studio.classes on conflict do nothing;
alter table studio.class_teachers enable row level security;
revoke all on studio.class_teachers from public, anon, authenticated;
commit;
