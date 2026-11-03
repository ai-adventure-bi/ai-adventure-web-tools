-- Run once in the same Supabase SQL Editor used for 002_lab.sql.
-- Adds Lab-only classroom credentials and image review. TopBot is unchanged.
begin;
alter table public.lab_students
 add column if not exists image_approval text not null default 'pending' check(image_approval in ('pending','approved','rejected')),
 add column if not exists image_review_path text,
 add column if not exists reviewed_project_path text,
 add column if not exists view_used integer not null default 0 check(view_used>=0),
 add column if not exists view_allowance integer not null default 1 check(view_allowance>=0);
create table if not exists public.lab_classroom_access (
 class_code text primary key references public.topbot_schools("classCode"),
 salt text not null, key_hash text not null, active boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.lab_classroom_access enable row level security;
revoke all on public.lab_classroom_access from public,anon,authenticated;
grant all on public.lab_classroom_access to service_role;
create or replace function public.lab_reserve(student_code text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.lab_students;
begin
 select * into s from public.lab_students where code=student_code for update;
 if not found or s.archived then raise exception 'Unavailable student code'; end if;
 perform 1 from public.topbot_schools where "classCode"=s.class_code and active for share;
 if not found then raise exception 'Classroom archived'; end if;
 if s.state in ('reserved','processing') then return jsonb_build_object('reserved',false); end if;
 if s.image_path is null or s.image_approval <> 'approved' or s.image_review_path is distinct from s.image_path then raise exception 'Image needs teacher approval'; end if;
 if s.used>=s.allowance or s.view_used>=s.view_allowance then raise exception 'No generation allowance'; end if;
 update public.lab_students set state='reserved',task_id=null,approval='pending',model_path=null,project_path=null,reviewed_project_path=null,stl_path=null,submitted=false,printed=false,view_used=view_used+1,updated_at=now() where code=student_code;
 return jsonb_build_object('reserved',true);
end $$;
revoke all on function public.lab_reserve(text) from public,anon,authenticated;
grant execute on function public.lab_reserve(text) to service_role;
notify pgrst,'reload schema';
commit;
