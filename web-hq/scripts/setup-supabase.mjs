import {createInterface} from 'node:readline/promises';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {secret} from './reset-teacher.mjs';

export function connectionSettings(input,key){
 const url=new URL(input.trim());
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw new Error('Enter the HTTPS Project URL, without an API path.');
 key=key.trim();
 if(!/^[A-Za-z0-9_.-]{20,2000}$/.test(key))throw new Error('That does not look like a Supabase server key.');
 if(!key.startsWith('sb_secret_')){
  let role;try{role=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role;}catch{}
  if(role!=='service_role')throw new Error('Use a secret key or legacy service_role key, not an anon/publishable key.');
 }
 return {SUPABASE_URL:url.origin,SUPABASE_SECRET_KEY:key};
}
export function updateEnvironment(content,settings){
 const lines=content.split(/\r?\n/);
 for(const [name,value]of Object.entries(settings)){
  const pattern=new RegExp('^\\s*(?:export\\s+)?'+name+'\\s*=');
  const first=lines.findIndex(line=>pattern.test(line));
  if(first<0)lines.push(`${name}=${value}`);
  else {lines[first]=`${name}=${value}`;for(let i=lines.length-1;i>first;i--)if(pattern.test(lines[i]))lines.splice(i,1);}
 }
 return lines.join('\n').replace(/^\n+/,'').replace(/\n*$/,'\n');
}
async function main(){
 process.chdir(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
 console.log('Connect Site Studio to Supabase\n');
 const prompt=createInterface({input:process.stdin,output:process.stdout});
 const url=await prompt.question('Paste your Supabase Project URL: ');prompt.close();
 console.log('\nNext paste the Supabase secret key (or legacy service_role key).\nThe key will not appear on screen. Press Enter after pasting.');
 const key=await secret('Server key: ');
 const settings=connectionSettings(url,key);
 let existing='';try{existing=await readFile('.env','utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 await writeFile('.env',updateEnvironment(existing,settings),{mode:0o600});
 console.log('\nConnection settings saved to the local .env file.');
 console.log('Restart Start Studio.cmd to load them. No remote requests were made; the connection has not yet been tested.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
