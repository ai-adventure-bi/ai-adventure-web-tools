// Read both older plain files and new compressed classroom files.
export async function readStoredFile(response){
 if(!response.ok)throw Error('Could not open the saved file. Please try again.');
 const blob=await response.blob(),magic=new Uint8Array(await blob.slice(0,2).arrayBuffer()),limit=40*1024*1024;
 if(magic[0]!==31||magic[1]!==139){if(blob.size>limit)throw Error('This file exceeds the Workshop limit.');return blob;}
 const reader=blob.stream().pipeThrough(new DecompressionStream('gzip')).getReader(),chunks=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('This file exceeds the Workshop limit.');chunks.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}return new Blob(chunks);
}
export async function readStoredProject(response){return JSON.parse(await (await readStoredFile(response)).text());}
