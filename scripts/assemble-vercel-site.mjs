import {cp, mkdir, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const root=new URL('../',import.meta.url);
const output=new URL('../_site/',import.meta.url);
const staticTools=['art-styles','boids','eliza','game-of-life','is-it-intelligent','mix-a-monster-tool','spectrograms'];
const ignore=source=>source.name==='node_modules'||source.name==='.git'||source.name==='.github'||source.name==='_site'||source.name==='.next'||source.name==='dist'||source.name==='static-dist'||source.name==='.vinext'||source.name==='.wrangler';

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp(new URL('../index.html',import.meta.url),new URL('../_site/index.html',import.meta.url));
for(const tool of staticTools)await cp(new URL(`../${tool}/`,import.meta.url),new URL(`../_site/${tool}/`,import.meta.url),{recursive:true,filter:source=>!ignore({name:source.split(/[\\/]/).pop()})});

for(const part of ['index.html','css','js','svg']){
  const source=new URL(`../flybrain-child-edition/${part}`,import.meta.url);
  const target=new URL(`../_site/flybrain-child-edition/${part}`,import.meta.url);
  await mkdir(new URL('../_site/flybrain-child-edition/',import.meta.url),{recursive:true});
  await cp(source,target,{recursive:true});
}
for(const part of ['index.html','css','js']){
  const source=new URL(`../topbot/${part}`,import.meta.url);
  const target=new URL(`../_site/topbot/${part}`,import.meta.url);
  await mkdir(new URL('../_site/topbot/',import.meta.url),{recursive:true});
  await cp(source,target,{recursive:true});
}
await cp(new URL('../quake-quest/static-dist/',import.meta.url),new URL('../_site/quake-quest/',import.meta.url),{recursive:true});
await writeFile(new URL('../_site/.nojekyll',import.meta.url),'');

console.log(`Assembled the public site in ${join(root.pathname,'_site')}`);
