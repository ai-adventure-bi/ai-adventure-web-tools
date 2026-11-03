-- Apply AFTER the existing 001_topbot.sql. No changes to TopBot tables.
begin;
create table public.lab_students (
 code text primary key, class_code text not null references public.topbot_schools("classCode"),
 allowance integer not null default 1 check(allowance>=0), used integer not null default 0,
 state text not null default 'new' check(state in ('new','reserved','processing','review','failed','ready')),
 task_id text, approval text not null default 'pending' check(approval in ('pending','approved','rejected')),
 image_path text, model_path text, project_path text, stl_path text,
 submitted boolean not null default false, printed boolean not null default false,
 archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.lab_students enable row level security;
revoke all on public.lab_students from public,anon,authenticated;
grant all on public.lab_students to service_role;
insert into storage.buckets(id,name,public,file_size_limit) values('3d-lab','3d-lab',false,52428800) on conflict(id) do update set public=false,file_size_limit=52428800;
create policy lab_storage_guard on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id <> '3d-lab') with check(bucket_id <> '3d-lab');
-- No anon/authenticated object policies are added. Only server service-role access.
create function public.lab_reserve(student_code text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.lab_students;
begin
 select * into s from public.lab_students where code=student_code for update;
 if not found or s.archived then raise exception 'Unavailable student code'; end if;
 perform 1 from public.topbot_schools where "classCode"=s.class_code and active for share;
 if not found then raise exception 'Classroom archived'; end if;
 if s.state in ('reserved','processing') then return jsonb_build_object('reserved',false); end if;
 if s.used>=s.allowance or s.image_path is null then raise exception 'No generation allowance or image'; end if;
 update public.lab_students set state='reserved',task_id=null,approval='pending',model_path=null,project_path=null,stl_path=null,submitted=false,printed=false,updated_at=now() where code=student_code;
 return jsonb_build_object('reserved',true);
end $$;
create function public.lab_finish(student_code text, expected_task text, stored_path text) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 update public.lab_students set state='review',approval='pending',model_path=stored_path,used=used+1,updated_at=now()
 where code=student_code and task_id=expected_task and state='processing';
 return found;
end $$;
revoke all on function public.lab_reserve(text),public.lab_finish(text,text,text) from public,anon,authenticated;
grant execute on function public.lab_reserve(text),public.lab_finish(text,text,text) to service_role;
commit;
