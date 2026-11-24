import {DatabaseSync} from 'node:sqlite';
import {mkdir,chmod} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
import {existsSync} from 'node:fs';
import {hashPassword} from '../server/app.mjs';

export async function resetTeacher(db,username,password){
 const user=db.prepare("SELECT id,username FROM users WHERE lower(username)=lower(?) AND role IN ('admin','teacher')").get(username);
 if(!user)throw new Error('Teacher account not found.');
 if(password.length<1||password.length>100)throw new Error('Use a password between 1 and 100 characters.');
 const hash=await hashPassword(password);
 db.exec('BEGIN IMMEDIATE');try{
  db.prepare('UPDATE users SET password=?,disabled=0 WHERE id=?').run(hash,user.id);
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
 return user.username;
}
export async function secret(label){
 if(!process.stdin.isTTY)throw new Error('Open the reset launcher in a terminal to enter your password privately.');
 process.stdout.write(label);process.stdin.setRawMode(true);process.stdin.resume();
 return new Promise((resolve,reject)=>{let value='';const finish=(error)=>{process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');error?reject(error):resolve(value);};const read=chunk=>{for(const char of chunk.toString()){if(char==='\u0003'){finish(new Error('Reset cancelled.'));return;}if(char==='\r'||char==='\n'){finish();return;}if(char==='\b'||char==='\u007f')value=value.slice(0,-1);else if(char>=' ')value+=char;}};process.stdin.on('data',read);});
}
async function main(){
 process.chdir(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
 const filename=resolve(process.env.STUDIO_LOCAL_DB||'.local/classroom.sqlite');
 if(!existsSync(filename))throw new Error('The local classroom database does not exist. Start Studio first.');
 const db=new DatabaseSync(filename,{open:true,readOnly:process.argv.includes('--list')});
 try{
  const users=db.prepare("SELECT username,name,role,disabled FROM users WHERE role IN ('admin','teacher') ORDER BY username").all();
  console.log('Local database: '+filename);
  if(!users.length){console.log('No teacher account exists here. Use the current setup code after restarting Studio.');return;}
  console.log('Teacher accounts:');for(const u of users)console.log(`  ${u.username} — ${u.name} (${u.role}${u.disabled?', disabled':''})`);
  if(process.argv.includes('--list'))return;
  let username=users.length===1?users[0].username:null;
  if(!username){const rl=createInterface({input:process.stdin,output:process.stdout});username=await rl.question('Username to reset: ');rl.close();}
  if(!users.some(u=>u.username.toLowerCase()===username.trim().toLowerCase()))throw new Error('That teacher account was not found.');
  console.log(`Resetting password for ${username}. Classes, websites and saved keys will be kept.`);
  const password=await secret('New password (hidden, at least 1 character): ');
  const again=await secret('Enter it again (hidden): ');
  if(password!==again)throw new Error('Passwords do not match. Nothing was changed.');
  if(password.length<1||password.length>100)throw new Error('Use 1–100 characters. Nothing was changed.');
  const folder=resolve('.local/backups');await mkdir(folder,{recursive:true,mode:0o700});
  const backup=resolve(folder,'before-teacher-reset-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
  db.prepare('VACUUM INTO ?').run(backup);await chmod(backup,0o600);
  await resetTeacher(db,username.trim(),password);
  console.log(`Password reset. Sign in as: ${username}`);console.log('Backup saved: '+backup);
 }finally{db.close();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
