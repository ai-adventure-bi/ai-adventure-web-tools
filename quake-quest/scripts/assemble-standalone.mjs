import {mkdir,cp} from 'node:fs/promises';
await mkdir('_site/quake-quest',{recursive:true});
await cp('static-dist','_site/quake-quest',{recursive:true});
