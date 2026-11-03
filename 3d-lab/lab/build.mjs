import {mkdir,cp,writeFile,rm} from 'node:fs/promises';
const root=new URL('../',import.meta.url),out=new URL('../dist/',import.meta.url);
await mkdir(new URL('lab/',out),{recursive:true});await rm(new URL('lab/cut.js',out),{force:true});await mkdir(new URL('vendor/',out),{recursive:true});
for(const file of ['index.html','lab/ui.js','lab/files.js','lab/workshop.js','lab/workshop-panel.js','lab/floating.js','lab/selection-cut.js','lab/contact.js','lab/mesh.js','lab/on-object.js','lab/print-room.js','lab/teacher-controller.js','lab/codes.mjs','lab/style.css','lab/workshop.css','lab/interface.css','lab/feedback.css'])await cp(new URL(file,root),new URL(file,out));
for(const file of ['three.module.js','OrbitControls.js','TransformControls.js','GLTFLoader.js','BufferGeometryUtils.js','STLExporter.js','LICENSE-three.txt'])await cp(new URL(`vendor/${file}`,root),new URL(`vendor/${file}`,out));
await writeFile(new URL('.nojekyll',out),'');console.log('Built static workshop in dist/. Server handlers and credentials are excluded.');
