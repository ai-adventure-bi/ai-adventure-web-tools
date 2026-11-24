-- Copies existing sharing choices; ungrouped classrooms remain private.
begin;
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
commit;
