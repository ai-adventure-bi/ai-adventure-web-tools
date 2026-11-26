import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {postgresSql,postgresAdapter} from '../server/postgres.mjs';
import handler from '../api/index.mjs';

test('Postgres adapter qualifies only app tables and keeps user values bound',async()=>{
 assert.equal(postgresSql('SELECT * FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=?'),'SELECT * FROM studio.users u JOIN studio.sessions s ON s.user_id=u.id WHERE s.token=$1');
 const calls=[];const client={async unsafe(sql,args){calls.push({sql,args});return Object.assign([{created:'1794573653673',n:'2',name:'42'}],{count:1});},async begin(fn){calls.push('begin');return fn(this);}};
 const db=postgresAdapter(client),value="x'); DROP TABLE users; --";
 const row=await db.prepare('SELECT created FROM users WHERE username=?').bind(value).first();
 assert.equal(row.created,1794573653673);assert.equal(row.n,2);assert.equal(row.name,'42');assert.equal(calls[0].args[0],value);assert.ok(!calls[0].sql.includes(value));
 const results=await db.batch([db.prepare('UPDATE users SET name=? WHERE id=?').bind('Name','id'),db.prepare('DELETE FROM sessions WHERE user_id=?').bind('id')]);
 assert.equal(results[0].meta.changes,1);assert.equal(calls[1],'begin');
 const offset=calls.length;
 await db.batch([db.prepare('UPDATE users SET role=? WHERE id=?').bind('teacher','id')],{accountManagement:true});
 assert.equal(calls[offset],'begin');assert.equal(calls[offset+1].sql,'SELECT pg_advisory_xact_lock(72819461)');
 assert.equal(postgresSql('SELECT * FROM schools WHERE id=?'),'SELECT * FROM studio.schools WHERE id=$1');
 const deletionOffset=calls.length;
 await db.batch([db.prepare('DELETE FROM projects WHERE id=? AND trashed=1').bind('site-id')],{projectDeletion:'site-id'});
 assert.equal(calls[deletionOffset],'begin');
 assert.equal(calls[deletionOffset+1].sql,'SELECT id FROM studio.projects WHERE id=$1 FOR UPDATE');
 assert.deepEqual(calls[deletionOffset+1].args,['site-id']);
 assert.match(calls[deletionOffset+2].sql,/DELETE FROM studio.projects/);
});

async function invoke(route){
 const req=Readable.from([]);req.method='GET';req.url='/api/index?route='+route;req.query={route};req.headers={host:'studio.example'};
 let status,headers,body;const res={writeHead(s,h){status=s;headers=h;},end(data){body=Buffer.from(data||'').toString();}};
 await handler(req,res);return {status,headers,body};
}
test('Vercel entrypoint serves deep links and sandbox without ChatGPT identity',async()=>{
 const home=await invoke('studio/test-project');assert.equal(home.status,200);assert.match(home.body,/<title>Web HQ<\/title>/);assert.ok(home.headers['content-security-policy']);
 const sandbox=await invoke('sandbox');assert.equal(sandbox.status,200);assert.match(sandbox.headers['content-security-policy'],/sandbox allow-scripts/);
});
test('Vercel fails explicitly when no persistent database is configured',async()=>{
 const old=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
 try{const response=await invoke('api/status');assert.equal(response.status,503);assert.match(JSON.parse(response.body).error,/database/);}finally{if(old!==undefined)process.env.DATABASE_URL=old;}
});
