import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
// Launchers and npm use this same entrypoint, regardless of the caller's folder.
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const code=await new Promise(resolve=>{const child=spawn(process.execPath,['scripts/build.mjs'],{stdio:'inherit',windowsHide:true});child.on('exit',resolve);child.on('error',()=>resolve(1));});
if(code!==0)process.exit(code||1);
await import('./local.mjs');
