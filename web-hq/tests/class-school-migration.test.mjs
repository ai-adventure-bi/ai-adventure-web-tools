import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';

test('existing websites require explicit cross-school sharing selection after migration',()=>{
 const db=new DatabaseSync(':memory:');try{db.exec("CREATE TABLE projects(id TEXT PRIMARY KEY);INSERT INTO projects VALUES('existing');");db.exec(readFileSync(new URL('../drizzle/0010_selected_site_sharing.sql',import.meta.url),'utf8'));assert.equal(db.prepare('SELECT share_external FROM projects').get().share_external,0);}finally{db.close();}
});
test('classroom-school migration preserves existing sharing choices and keeps ungrouped clubs private',()=>{
 const db=new DatabaseSync(':memory:');try{
 db.exec("CREATE TABLE schools(id TEXT PRIMARY KEY,shared INTEGER,description TEXT);CREATE TABLE classes(id TEXT PRIMARY KEY,school_id TEXT);INSERT INTO schools VALUES('public',1,'A shared club'),('private',0,'Private club');INSERT INTO classes VALUES('a','public'),('b','private'),('c',NULL);");
 db.exec(readFileSync(new URL('../drizzle/0007_careful_thing.sql',import.meta.url),'utf8'));
 assert.deepEqual(db.prepare('SELECT id,shared,description FROM classes ORDER BY id').all().map(r=>({...r})),[{id:'a',shared:1,description:'A shared club'},{id:'b',shared:0,description:'Private club'},{id:'c',shared:0,description:''}]);
 }finally{db.close();}
});
