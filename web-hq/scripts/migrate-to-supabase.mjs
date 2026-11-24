import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import postgres from 'postgres';

export const transferTables=['schools','classes','users','class_teachers','projects','versions','addresses','boards','scores','media','questions'];
export function readTransfer(filename){
 const db=new DatabaseSync(filename,{readOnly:true});
 try{
  db.exec('BEGIN');
  const data=Object.fromEntries(transferTables.map(table=>[table,db.prepare(`SELECT * FROM ${table}`).all().map(row=>({...row}))]));
  const logins=new Set();
  for(const u of data.users){if(u.role==='student')u.username=u.permanent_id.toLowerCase();if(logins.has(u.username.toLowerCase()))throw new Error('Conflicting login IDs. Resolve these locally first.');logins.add(u.username.toLowerCase());}
  if(!data.users.some(u=>u.role==='admin'&&!u.disabled))throw new Error('The source needs an active admin.');
  const users=new Set(data.users.map(u=>u.id)),classes=new Set(data.classes.map(c=>c.id)),projects=new Map(data.projects.map(p=>[p.id,p])),versions=new Map(data.versions.map(v=>[v.id,v]));
  for(const p of data.projects){if(!users.has(p.owner)||!classes.has(p.class_id)||p.published_id&&versions.get(p.published_id)?.project_id!==p.id)throw new Error('A website has a missing owner, classroom or published version.');}
  for(const table of ['versions','addresses','boards','scores','media','questions'])for(const row of data[table])if(!projects.has(row.project_id))throw new Error('Saved website data has a missing website.');
  db.exec('COMMIT');return data;
 }finally{db.close();}
}
export async function transfer(client,data,{apply=false}={}){
 return client.begin(async tx=>{
  // Shares the bootstrap/admin lock; refuse to merge into an occupied destination.
  if(apply){await tx.unsafe('SELECT pg_advisory_xact_lock(72819461)');await tx.unsafe('LOCK TABLE '+[...transferTables,'sessions','limits'].map(t=>'studio.'+t).join(',')+' IN EXCLUSIVE MODE');}
  for(const table of [...transferTables,'sessions','limits']){
   const [row]=await tx.unsafe(`SELECT count(*) AS n FROM studio.${table}`);
   if(Number(row.n)!==0)throw new Error('The destination studio schema is not empty. Nothing was imported.');
  }
  for(const table of transferTables){
   const columns=(await tx.unsafe('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',['studio',table])).map(r=>r.column_name);
   for(const row of data[table])if(Object.keys(row).some(c=>!columns.includes(c)))throw new Error('The destination schema needs updating with database/supabase-studio.sql.');
   if(apply)for(const row of data[table]){const names=Object.keys(row);if(names.some(n=>!/^[a-z_]+$/.test(n)))throw new Error('Unexpected source column.');await tx.unsafe(`INSERT INTO studio.${table} (${names.map(n=>'"'+n+'"').join(',')}) VALUES (${names.map((_,i)=>'$'+(i+1)).join(',')})`,names.map(n=>row[n]));}
   if(apply){const [count]=await tx.unsafe(`SELECT count(*) AS n FROM studio.${table}`);if(Number(count.n)!==data[table].length)throw new Error('Import count mismatch. The transaction will be rolled back.');}
  }
  return Object.fromEntries(transferTables.map(t=>[t,data[t].length]));
 });
}
async function main(){
 const args=process.argv.slice(2);if(args.some(a=>!['--check','--apply'].includes(a))||args.includes('--check')&&args.includes('--apply'))throw new Error('Use --check or --apply.');
 const filename=resolve(process.env.STUDIO_LOCAL_DB||'.local/classroom.sqlite');if(!existsSync(filename))throw new Error('Local classroom database not found. Run this from the original app folder.');
 const data=readTransfer(filename);console.log('Local rows to transfer (no passwords, keys or student work displayed):',Object.fromEntries(transferTables.map(t=>[t,data[t].length])));
 if(!args.length){console.log('Read-only local check complete. Use --check to check the destination, or --apply for the one-time import after stopping local use.');return;}
 const connection=process.env.WEB_HQ_DATABASE_URL||process.env.DATABASE_URL;if(!connection)throw new Error('Add WEB_HQ_DATABASE_URL to your private .env file.');
 if(args.includes('--apply')){mkdirSync('.local/backups',{recursive:true});const backup=resolve('.local/backups/before-hosted-migration-'+Date.now()+'.sqlite');const db=new DatabaseSync(filename,{readOnly:true});try{db.prepare('VACUUM INTO ?').run(backup);}finally{db.close();}console.log('Private local backup created.');}
 const client=postgres(connection,{prepare:false,max:1,ssl:'require',connect_timeout:15,idle_timeout:5});
 try{await transfer(client,data,{apply:args.includes('--apply')});console.log(args.includes('--apply')?'Import committed. Accounts, password hashes, website URLs, uploaded media, history and Vault references are preserved. Sign in again online; sessions were not transferred.':'Destination is empty and compatible. No online data was changed.');}finally{await client.end({timeout:5});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(()=>{console.error('Migration stopped. Check the private connection settings, empty destination schema and local data. No partial import is committed.');process.exitCode=1;});
