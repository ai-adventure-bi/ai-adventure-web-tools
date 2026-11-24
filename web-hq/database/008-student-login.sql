BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT lower(permanent_id) FROM studio.users WHERE role='student' GROUP BY lower(permanent_id) HAVING count(*)>1)
 OR EXISTS(SELECT 1 FROM studio.users s JOIN studio.users t ON lower(s.permanent_id)=lower(t.username) WHERE s.role='student' AND t.role<>'student') THEN
  RAISE EXCEPTION 'Student permanent IDs collide with another login. Resolve the collision before migrating.';
 END IF;
END $$;
UPDATE studio.users SET username='~student-login~'||id WHERE role='student';
UPDATE studio.users SET username=lower(permanent_id) WHERE role='student';
COMMIT;
