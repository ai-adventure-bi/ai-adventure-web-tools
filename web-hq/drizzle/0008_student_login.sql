-- Preserve ownership and Vault IDs; students now use their permanent ID to sign in.
-- A collision aborts the whole migration rather than changing anyone's ID.
CREATE TEMP TABLE student_login_check (valid INTEGER CHECK(valid=1));
INSERT INTO student_login_check SELECT CASE WHEN
 EXISTS(SELECT lower(permanent_id) FROM users WHERE role='student' GROUP BY lower(permanent_id) HAVING count(*)>1)
 OR EXISTS(SELECT 1 FROM users s JOIN users t ON lower(s.permanent_id)=lower(t.username) WHERE s.role='student' AND t.role<>'student')
 THEN 0 ELSE 1 END;
DROP TABLE student_login_check;
UPDATE users SET username='~student-login~'||id WHERE role='student';
UPDATE users SET username=lower(permanent_id) WHERE role='student';
