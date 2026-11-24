import {diffLines,diffWordsWithSpace} from 'diff';

export function codeChanges(before,after){
 const parts=diffLines(before,after,{stripTrailingCr:true,timeout:150,maxEditLength:6000})||[{value:before,removed:true},{value:after,added:true}];
 const rows=[];let oldLine=1,newLine=1;
 for(const part of parts){const lines=part.value.split('\n');if(lines.at(-1)==='')lines.pop();for(const text of lines)rows.push({text,type:part.added?'added':part.removed?'removed':'same',oldLine:part.added?null:oldLine++,newLine:part.removed?null:newLine++});}
 const hunks=[];let hunk=null;
 for(const row of rows){if(row.type==='same'){hunk=null;continue;}if(!hunk){hunk={id:hunks.length+1,rows:[],before:'',after:''};hunks.push(hunk);}hunk.rows.push(row);hunk[row.type==='added'?'after':'before']+=row.text+'\n';}
 return {rows,hunks,added:rows.filter(r=>r.type==='added').length,removed:rows.filter(r=>r.type==='removed').length};
}
export function changedWords(before,after){return diffWordsWithSpace(before,after,{timeout:50})||[{value:before,removed:true},{value:after,added:true}];}

const lessons=[
 {match:/\bimport\b/,title:'Using shared code',meaning:'An import connects this file to code from a library or another file. Removing an import means those names are no longer available here.',test:'Check that the page still starts and that any imported icons or controls still appear.',tryIt:'Find a name inside the import and find where it is used in the page.'},
 {match:/\buseState\b|\bset[A-Z]\w*\s*\(/,title:'Remembering a value',meaning:'State is a value the page remembers. Changing it asks React to draw the updated page.',test:'Change the value by using the page, then check what updates.',tryIt:'Find the starting value. Change it yourself and predict the first thing you will see.'},
 {match:/\bonClick\s*=|addEventListener\s*\(/,title:'Responding to an action',meaning:'An event handler is code that runs when someone clicks, taps or types.',test:'Try the control once, then several times. Check what it does each time.',tryIt:'Find the function attached to the action. Change one instruction inside it.'},
 {match:/\bclassName\s*=|\bstyle\s*=|\bclass\s*=|#[a-fA-F0-9]{3,8}\b|\b(background|font-size|padding|color)\s*:/,title:'Changing the appearance',meaning:'Styles control how something looks: its colour, spacing, size and position. They can change without changing the rules of the page.',test:'Check the affected part at phone and tablet widths. Can you still read and tap it?',tryIt:'Change one colour or spacing value yourself, then check the result.'},
 {match:/<a\b|href\s*=/,title:'Linking pages',meaning:'A link points to an address. It lets someone move from this page to another page.',test:'Follow the link, then use the back-to-class button. Check that neither route gets you stuck.',tryIt:'Change the link text while keeping its address the same.'},
 {match:/\.map\s*\(|\bfor\s*\(|\bwhile\s*\(/,title:'Repeating instructions',meaning:'A loop or map repeats an instruction for a collection of items instead of writing the same code over and over.',test:'Check the first item, last item and an empty list if your page supports one.',tryIt:'Add one item to the list and predict how many things will appear.'},
 {match:/\bif\s*\(|\?[^\n]+:|&&\s*</,title:'Making a decision',meaning:'A condition chooses what happens depending on whether something is true or false.',test:'Try an example for each possible outcome. Do both routes work?',tryIt:'Find the comparison and predict what happens exactly at its boundary.'},
 {match:/\bfunction\b|=>/,title:'Grouping instructions',meaning:'A function groups instructions so the page can run them together when they are needed.',test:'Find where the function is called. Try the action or input that calls it.',tryIt:'Trace the function one instruction at a time and explain the order.'}
];
export function explainChange(hunk){
 const words=changedWords(hunk.before,hunk.after);const changed=words.filter(p=>p.added||p.removed).map(p=>p.value).join(' ');
 const context=hunk.before+'\n'+hunk.after;
 // Prefer the changed tokens over surrounding JSX on a long line.
 const found=lessons.find(l=>l.match.test(changed))||(/\buseState\s*\(/.test(context)?lessons.find(l=>l.title==='Remembering a value'):null)||(!/[a-zA-Z]{2,}/.test(changed)?lessons.find(l=>l.match.test(context)):null);
 const fallback={title:'Changing page content',meaning:'This changes the text or structure written in the page. Compare the removed code with the added code to find exactly what is different.',test:'Find the changed part in the preview and check that it works as intended.',tryIt:'Edit one word yourself and check where it appears.'};
 const primary=found||fallback;
 const concepts=lessons.filter(l=>l.match.test(context)&&l.title!==primary.title).slice(0,3);
 const observations=[];
 const oldState=hunk.before.match(/useState\(([^\n)]*)\)/)?.[1],newState=hunk.after.match(/useState\(([^\n)]*)\)/)?.[1];
 if(oldState!==undefined&&newState!==undefined&&oldState!==newState)observations.push(`The starting value in useState changes from ${oldState} to ${newState}. That is the value shown before anyone uses the page.`);
 const oldText=[...hunk.before.matchAll(/>([^<>{}\n]+)</g)].map(m=>m[1].trim()).filter(Boolean),newText=[...hunk.after.matchAll(/>([^<>{}\n]+)</g)].map(m=>m[1].trim()).filter(Boolean);
 if(oldText.join('|')!==newText.join('|')&&(oldText.length||newText.length))observations.push(`Visible text in this part changes from ${oldText.length?oldText.slice(0,3).map(t=>'“'+t.slice(0,90)+'”').join(', '):'no fixed text'} to ${newText.length?newText.slice(0,3).map(t=>'“'+t.slice(0,90)+'”').join(', '):'no fixed text'}.`);
 return {...primary,concepts,observations};
}
export function parseTeaching(reply,before,after){
 const block=[...String(reply||'').matchAll(/```json\s*\n([\s\S]*?)```/gi)][0];if(!block)return null;
 try{
  const data=JSON.parse(block[1]),changes=[];
  for(const item of Array.isArray(data.changes)?data.changes.slice(0,12):[]){
   if(typeof item.before!=='string'||typeof item.after!=='string'||(!item.before.trim()&&!item.after.trim())||item.before===item.after)continue;
   if((item.before&&!before.includes(item.before))||(item.after&&!after.includes(item.after)))continue;
   if(!['explanation','test','challenge'].every(k=>typeof item[k]==='string'&&item[k].length<=1000))continue;
   changes.push({before:item.before,after:item.after,explanation:item.explanation,test:item.test,challenge:item.challenge});
  }
  return changes.length?{changes}:null;
 }catch{return null;}
}
export function teachingForHunk(hunk,teaching){
 return teaching?.changes?.find(c=>(!c.before||hunk.before.includes(c.before))&&(!c.after||hunk.after.includes(c.after)))||null;
}
