import {importModelFile} from './model-import.js';
self.onmessage=async({data:file})=>{
 try{const project=await importModelFile(file,{onProgress:progress=>self.postMessage({progress})});self.postMessage({project});}
 catch(error){self.postMessage({error:error.message||'This model could not be imported.'});}
};
