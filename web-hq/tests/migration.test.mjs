import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transfer,transferTables} from '../scripts/migrate-to-supabase.mjs';

test('hosted transfer refuses occupied databases, binds private content and checks row counts in one transaction',async()=>{
 const data=Object.fromEntries(transferTables.map(t=>[t,[]]));data.users=[{id:'student',name:"Name'); DROP TABLE users;--",password:'hashed-password',vault_id:'stable-vault-id'}];
 const calls=[],stored=new Map(transferTables.map(t=>[t,[]]));let committed=false,occupied=false;
 const client={async begin(fn){const result=await fn(this);committed=true;return result;},async unsafe(sql,args){calls.push({sql,args});const table=sql.match(/studio\.([a-z_]+)/)?.[1];if(sql.startsWith('SELECT count'))return [{n:occupied?1:(stored.get(table)||[]).length}];if(sql.includes('information_schema'))return Object.keys(data[args[1]][0]||{}).map(column_name=>({column_name}));if(sql.startsWith('INSERT'))stored.get(table).push(args);return [];}};
 const counts=await transfer(client,data,{apply:true});assert.equal(counts.users,1);assert.ok(committed);const insert=calls.find(c=>c.sql.startsWith('INSERT'));assert.deepEqual(insert.args,Object.values(data.users[0]));assert.ok(!insert.sql.includes(data.users[0].name));assert.ok(calls[0].sql.includes('pg_advisory_xact_lock'));assert.ok(calls[1].sql.startsWith('LOCK TABLE'));
 committed=false;occupied=true;const before=calls.filter(c=>c.sql.startsWith('INSERT')).length;await assert.rejects(transfer(client,data,{apply:true}),/not empty/);assert.equal(committed,false);assert.equal(calls.filter(c=>c.sql.startsWith('INSERT')).length,before);
});
