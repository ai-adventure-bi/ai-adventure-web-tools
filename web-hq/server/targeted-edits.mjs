export class EditReplyError extends Error{}
const reject=message=>{throw new EditReplyError(message+' Your draft is unchanged.');};

export function checkCompletion(result){
 const choice=result?.choices?.[0],reason=String(choice?.finish_reason||result?.finish_reason||result?.stop_reason||result?.status||'').toLowerCase();
 if(['length','max_tokens','max_output_tokens','incomplete'].includes(reason)||result?.incomplete_details)reject('HeyOtto’s reply was cut short. Ask for fewer changes at once.');
 if(reason==='content_filter')reject('HeyOtto could not complete this reply.');
 if(typeof choice?.message?.content!=='string'||!choice.message.content.trim())reject('HeyOtto did not return a readable reply.');
 return choice.message.content;
}

export function readEdits(reply){
 if(typeof reply!=='string'||reply.length>260000)reject('HeyOtto returned too much text. Ask for a smaller change.');
 const fences=[...reply.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)];
 const candidates=fences.filter(m=>/^json\s*$/i.test(m[1])).map(m=>m[2]);
 if(reply.trim().startsWith('{'))candidates.push(reply.trim());
 const payloads=[];
 for(const candidate of candidates){try{const data=JSON.parse(candidate);if(data&&Object.hasOwn(data,'edits'))payloads.push(data);}catch{}}
 if(payloads.length>1)reject('HeyOtto returned more than one set of edits.');
 if(payloads.length===1){const edits=payloads[0].edits;if(!Array.isArray(edits)||!edits.length||edits.length>20)reject('HeyOtto must return between 1 and 20 specific edits.');return {edits,payload:payloads[0]};}
 if(/(?:^\s*\{|```json)/.test(reply)&&/"edits"\s*:/.test(reply))reject('HeyOtto’s edits could not be read completely. The reply may have been cut short.');
 return null;
}

export function applyEdits(original,edits,selection){
 const ranges=[];
 for(const edit of edits){
  if(!edit||typeof edit.before!=='string'||!edit.before.length||typeof edit.after!=='string'||edit.before.length>180000||edit.after.length>180000)reject('Each edit needs an exact existing section and its replacement.');
  if(original.length>18000&&(edit.before.length>16000||edit.after.length>24000))reject('This replacement is too large for a targeted edit. Ask for one smaller part.');
  if(edit.file&& !['App.jsx','index.html'].includes(edit.file))reject('This edit targets a different file.');
  const start=original.indexOf(edit.before);
  if(start<0)reject('HeyOtto’s edit does not match your saved code. Try selecting the part you want changed.');
  if(original.indexOf(edit.before,start+1)!==-1)reject('HeyOtto’s edit matches more than one place. Select a more specific section.');
  const end=start+edit.before.length;
  if(selection&&(start<selection.from||end>selection.to))reject('HeyOtto tried to edit outside your selection.');
  if(ranges.some(r=>start<r.end&&end>r.start))reject('HeyOtto returned overlapping edits. Ask for a smaller change.');
  ranges.push({start,end,after:edit.after});
 }
 let proposed=original;for(const edit of ranges.sort((a,b)=>b.start-a.start))proposed=proposed.slice(0,edit.start)+edit.after+proposed.slice(edit.end);
 if(proposed.length>180000)reject('The edited file would be too large.');
 if(proposed===original)reject('HeyOtto did not propose any code changes.');
 return proposed;
}
