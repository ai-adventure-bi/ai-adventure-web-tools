// Explicit source allowlist: never copy local environments, browser profiles or recordings.
import {cp,mkdir,access} from 'node:fs/promises';
const out=new URL('../outputs/github-ready/',import.meta.url);
try {await access(out);throw Error('outputs/github-ready already exists; choose a fresh output directory before packaging again.');} catch(e) {if(e.code!=='ENOENT')throw e;}
await mkdir(out,{recursive:true});
const files=['app','public','server','scripts','api','integration-tests','package.json','package-lock.json','index.html','static-main.tsx','tsconfig.json','vite.static.config.ts','vite.config.ts','next.config.ts','eslint.config.mjs','.gitignore','.dockerignore','Dockerfile','vercel.json','DEPLOYMENT.md','HEYOTTO.md','Start Quake Quest.cmd'];
for(const name of files)await cp(new URL('../'+name,import.meta.url),new URL(name,out),{recursive:true,filter:p=>!p.includes('__pycache__')&&!p.endsWith('.pyc')&&!p.includes('browser-profile')&&!p.endsWith('.png')});
console.log('Created outputs/github-ready. No API keys, browser profiles or waveform recordings copied.');
