import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd(),review=path.join(root,'.local/web-tools-review');
const output=path.join(root,'outputs/github-upload');
const app=path.join(output,'web-hq');
if(!await fs.stat(path.join(review,'package.json')).catch(()=>null))throw new Error('Read the current web-tools repository into .local/web-tools-review first.');
// A fresh output folder avoids accidentally retaining an old private file.
if(await fs.stat(output).catch(()=>null))throw new Error('outputs/github-upload already exists. Move it aside before preparing another package.');
await fs.mkdir(app,{recursive:true});
const folders=['api','database','drizzle','scripts','server','src','tests'];
const files=['.env.example','.gitignore','.vercelignore','package.json','package-lock.json','drizzle.config.ts','vercel.json','Start Studio.cmd','Start Studio Demo.cmd','Connect Supabase.cmd','Reset Teacher Login.cmd'];
for(const entry of await fs.readdir(root))if(entry.endsWith('.md'))files.push(entry);
for(const folder of folders)await fs.cp(path.join(root,folder),path.join(app,folder),{recursive:true});
for(const file of files)await fs.copyFile(path.join(root,file),path.join(app,file));
await fs.mkdir(path.join(output,'api'),{recursive:true});
await fs.writeFile(path.join(output,'api/web-hq.mjs'),`import {createHandler} from '../web-hq/api/index.mjs';
export default createHandler({basePath:'/web-hq',environment:()=>({
 DATABASE_URL:process.env.WEB_HQ_DATABASE_URL,
 SUPABASE_URL:process.env.WEB_HQ_SUPABASE_URL,
 SUPABASE_SECRET_KEY:process.env.WEB_HQ_SUPABASE_SECRET_KEY,
 STUDIO_SETUP_TOKEN:process.env.WEB_HQ_SETUP_TOKEN,
 HEYOTTO_MODEL:process.env.WEB_HQ_HEYOTTO_MODEL||'heyotto-code',
 HEYOTTO_APP_ID:process.env.WEB_HQ_HEYOTTO_APP_ID,
 HEYOTTO_TIMEOUT_MS:process.env.WEB_HQ_HEYOTTO_TIMEOUT_MS||'180000'
})});
`);
const pkg=JSON.parse(await fs.readFile(path.join(review,'package.json'),'utf8'));
pkg.scripts.build='npm --prefix web-hq ci && npm --prefix web-hq run build && '+pkg.scripts.build;
await fs.writeFile(path.join(output,'package.json'),JSON.stringify(pkg,null,2)+'\n');
const config=JSON.parse(await fs.readFile(path.join(review,'vercel.json'),'utf8'));
config.functions['api/web-hq.mjs']={maxDuration:300,includeFiles:'web-hq/dist/server/**'};
config.rewrites=[{source:'/web-hq',destination:'/api/web-hq?route='},{source:'/web-hq/:path*',destination:'/api/web-hq?route=:path*'},...(config.rewrites||[])];
await fs.writeFile(path.join(output,'vercel.json'),JSON.stringify(config,null,2)+'\n');
let html=await fs.readFile(path.join(review,'index.html'),'utf8');
if(html.includes('path: "web-hq"'))throw new Error('Web HQ is already in the hub. Review its current link before packaging.');
html=html.replace('const tools = [','const tools = [\n      { path: "web-hq", liveUrl: "/web-hq/", localUrl: "http://127.0.0.1:4185/", icon: "💾", title: "Web HQ", description: "Build websites and games, edit the code and visit your classmates’ creations.", color: "#BDF568" },');
await fs.writeFile(path.join(output,'index.html'),html);
let assembly=await fs.readFile(path.join(review,'scripts/assemble-vercel-site.mjs'),'utf8');
assembly=assembly.replace("await writeFile(new URL('../_site/.nojekyll',import.meta.url),'');",`// Web HQ runs in a server function. Never copy its source, settings or classroom data into _site.
await writeFile(new URL('../_site/.nojekyll',import.meta.url),'');`);
await fs.mkdir(path.join(output,'scripts'),{recursive:true});
await fs.writeFile(path.join(output,'scripts/assemble-vercel-site.mjs'),assembly);
await fs.copyFile(path.join(root,'GITHUB-AND-VERCEL.md'),path.join(output,'DEPLOY-WEB-HQ.md'));
await fs.mkdir(path.join(output,'.github/workflows'),{recursive:true});
await fs.writeFile(path.join(output,'.github/workflows/web-hq-checks.yml'),`name: Check Web HQ
on:
  push:
    paths: ['web-hq/**', 'api/web-hq.mjs', '.github/workflows/web-hq-checks.yml']
  pull_request:
    paths: ['web-hq/**', 'api/web-hq.mjs', '.github/workflows/web-hq-checks.yml']
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web-hq
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
          cache-dependency-path: web-hq/package-lock.json
      - run: npm ci
      - run: npm run build
      - run: npm test
`);
const paths=[];async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else paths.push(p);}}await walk(output);
const secrets=['SUPABASE_SECRET_KEY','STUDIO_SETUP_TOKEN','DATABASE_URL','WEB_HQ_DATABASE_URL','WEB_HQ_SUPABASE_SECRET_KEY','WEB_HQ_SETUP_TOKEN'].map(k=>process.env[k]).filter(v=>v&&v.length>=8);
for(const p of paths){const relative=path.relative(output,p).replaceAll('\\','/');if(/(^|\/)(\.env|\.local|node_modules|\.git|dist|outputs|screenshots)(\/|$)/.test(relative)||/\.sqlite|\.zip$/.test(relative))throw new Error('Unexpected private/generated file in upload: '+relative);const data=await fs.readFile(p,'utf8');if(secrets.some(s=>data.includes(s)))throw new Error('A configured secret was found in upload: '+relative);}
const revision=execFileSync('git',['-c','safe.directory='+review.replaceAll('\\','/'),'-C',review,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
await fs.writeFile(path.join(output,'UPLOAD-CONTENTS.json'),JSON.stringify({repository:'https://github.com/ai-adventure-bi/ai-adventure-web-tools',basedOnCommit:revision,appDirectory:'web-hq',sitePath:'/web-hq/',files:paths.map(p=>path.relative(output,p).replaceAll('\\','/')).sort(),containsClassroomData:false,containsEnvironmentSecrets:false},null,2)+'\n');
console.log('Prepared '+paths.length+' source/configuration files in '+output+'. No upload or deployment performed.');
