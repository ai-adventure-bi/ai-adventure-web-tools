import * as esbuild from 'esbuild';
import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
await mkdir('.local/build',{recursive:true});await mkdir('dist/server',{recursive:true});await mkdir('public',{recursive:true});
for(const f of await readdir('.local/build'))if(/^[a-zA-Z0-9_-]+\.(js|css)$/.test(f))await unlink(path.join(root,'.local/build',f));
const frontend=await esbuild.build({entryPoints:['src/app.jsx'],bundle:true,splitting:true,format:'esm',outdir:'.local/build',entryNames:'app-[hash]',chunkNames:'chunk-[hash]',minify:true,target:['safari16'],metafile:true,define:{'process.env.NODE_ENV':'"production"'},legalComments:'none'});
await esbuild.build({entryPoints:['src/runtime.jsx'],bundle:true,format:'iife',outfile:'.local/build/runtime.js',minify:true,target:['safari16'],define:{'process.env.NODE_ENV':'"production"'},legalComments:'none'});
await esbuild.build({entryPoints:['src/sandbox.mjs'],bundle:true,format:'iife',outfile:'.local/build/sandbox.js',minify:true,target:['safari16'],legalComments:'none'});
const tailwind=await readFile('node_modules/@tailwindcss/browser/dist/index.global.js','utf8');
const [entryPath,entryMeta]=Object.entries(frontend.metafile.outputs).find(([file,meta])=>meta.entryPoint==='src/app.jsx'&&file.endsWith('.js'));
const html=(await readFile('src/index.html','utf8')).replace('/assets/app.js','/assets/'+path.basename(entryPath)).replace('/assets/app.css','/assets/'+path.basename(entryMeta.cssBundle));
const assets={'/':{type:'text/html; charset=utf-8',body:html},'/assets/tailwind.js':{type:'text/javascript; charset=utf-8',body:tailwind}};
for(const f of await readdir('.local/build')){if(/\.(js|css)$/.test(f))assets['/assets/'+f]={type:f.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8',body:await readFile('.local/build/'+f,'utf8')};}
await writeFile('dist/assets.mjs','export const assets='+JSON.stringify(assets)+';');
await esbuild.build({entryPoints:['server/web.mjs'],bundle:true,format:'esm',outfile:'dist/server/index.js',target:'es2022',platform:'node',minify:true,legalComments:'none'});
const stats=(await import('node:fs/promises')).stat;console.log(`Built standalone studio: ${Math.round((await stats('dist/server/index.js')).size/1024)} KB. Ready for the local server or Vercel function.`);
