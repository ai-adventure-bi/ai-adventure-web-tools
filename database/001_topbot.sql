-- Run once in a new Supabase project's SQL Editor. No seed data or browser import.
begin;
create table public.topbot_schools (
  "classCode" text primary key check ("classCode" ~ '^[1-9][0-9]{3}$'),
  "schoolName" text not null check (length("schoolName") between 1 and 80),
  "expectedStudents" integer check ("expectedStudents" between 1 and 100),
  "createdAt" timestamptz not null default now(),
  active boolean not null default true,
  "archivedAt" timestamptz
);
create table public.topbot_tops (
  "topCode" text primary key check ("topCode" ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$'),
  "classCode" text not null references public.topbot_schools("classCode"),
  "studentName" text not null check (length("studentName") between 1 and 30),
  filament text not null check (filament in ('pastel','vivid','white')),
  recipe jsonb not null check (jsonb_typeof(recipe) = 'object'),
  "submissionId" uuid not null unique,
  "submittedAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "printStatus" text not null default 'waiting' check ("printStatus" in ('waiting','printed')),
  trashed boolean not null default false,
  "trashedAt" timestamptz
);
create index topbot_tops_school on public.topbot_tops("classCode");
create table public.topbot_limits (
  bucket text primary key, started timestamptz not null, count integer not null
);

alter table public.topbot_schools enable row level security;
alter table public.topbot_tops enable row level security;
alter table public.topbot_limits enable row level security;
revoke all on public.topbot_schools, public.topbot_tops, public.topbot_limits from anon, authenticated;
grant all on public.topbot_schools, public.topbot_tops, public.topbot_limits to service_role;

create function public.topbot_create_school(school_name text, expected_students integer)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare result public.topbot_schools; candidate text; start_code integer;
begin
  -- Allocate without collisions, including with simultaneous administrators.
  perform pg_advisory_xact_lock(724182);
  start_code := floor(random()*9000)::integer;
  for i in 0..8999 loop
    candidate := (1000 + ((start_code+i)%9000))::text;
    insert into public.topbot_schools("classCode","schoolName","expectedStudents")
      values(candidate,school_name,expected_students) on conflict do nothing returning * into result;
    if found then return to_jsonb(result); end if;
  end loop;
  raise exception 'Code space exhausted';
end $$;

create function public.topbot_submit(submission_id uuid, school_code text, student_name text, chosen_filament text, design_recipe jsonb)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare result public.topbot_tops; candidate text; alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
begin
  -- A network retry with the same submission id returns the original Top Code.
  perform pg_advisory_xact_lock(hashtextextended(submission_id::text,0));
  select * into result from public.topbot_tops where "submissionId"=submission_id;
  if found then return jsonb_build_object('topCode',result."topCode"); end if;
  -- This lock serializes submissions with archiving: no new save after archive commits.
  perform 1 from public.topbot_schools where "classCode"=school_code and active for share;
  if not found then raise exception 'School not found or archived'; end if;
  for attempt in 1..100 loop
    candidate := '';
    for i in 1..5 loop
      candidate := candidate || substr(alphabet,1+floor(random()*length(alphabet))::integer,1);
    end loop;
    insert into public.topbot_tops("topCode","classCode","studentName",filament,recipe,"submissionId")
      values(candidate,school_code,student_name,chosen_filament,design_recipe,submission_id)
      on conflict do nothing returning * into result;
    if found then return jsonb_build_object('topCode',result."topCode"); end if;
  end loop;
  raise exception 'Top code allocation failed';
end $$;

create function public.topbot_rate_limit(bucket_key text, max_requests integer, window_seconds integer)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare hits integer;
begin
  delete from public.topbot_limits where started < now() - interval '1 day';
  insert into public.topbot_limits as limits(bucket,started,count) values(bucket_key,now(),1)
  on conflict(bucket) do update set
    started = case when limits.started < now()-make_interval(secs=>window_seconds) then now() else limits.started end,
    count = case when limits.started < now()-make_interval(secs=>window_seconds) then 1 else limits.count+1 end
  returning count into hits;
  return hits <= max_requests;
end $$;

revoke all on function public.topbot_create_school(text,integer), public.topbot_submit(uuid,text,text,text,jsonb), public.topbot_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.topbot_create_school(text,integer), public.topbot_submit(uuid,text,text,text,jsonb), public.topbot_rate_limit(text,integer,integer) to service_role;
commit;
