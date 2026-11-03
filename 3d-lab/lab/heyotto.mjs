import {createHash} from 'node:crypto';
import {HttpError} from '../../server/http.mjs';
import {imageMessages} from './policy.mjs';
const fail=(status,message)=>{throw new HttpError(status,message);};
const requests=new Map();
export function blobImageURL(value){
 let url;try{url=new URL(value);}catch{fail(400,'Choose an image link returned by HeyOtto.');}
 // Current public stores and the older per-store Blob host format. Never allow
 // private stores, lookalike suffixes, credentials, alternate ports or redirects.
 if(url.protocol!=='https:'||url.username||url.password||url.port&&!['443',''].includes(url.port)||!/^[-a-z0-9]+\.(?:public\.)?blob\.vercel-storage\.com$/i.test(url.hostname)||url.hostname.startsWith('private.'))fail(400,'HeyOtto images must use a public Vercel Blob image link.');
 url.hash='';return url.href;
}
export function extractBlobImages(content){
 const text=typeof content==='string'?content:Array.isArray(content)?content.filter(p=>p.type==='text').map(p=>p.text||'').join('\n'):'';
 const images=[];
 for(const match of text.replace(/\\\//g,'/').replace(/&amp;/g,'&').matchAll(/https?:\/\/[^\s<>"'\x00-\x1f]+/gi)){
  try{const url=blobImageURL(match[0].replace(/[)\]},.;!?]+$/,''));if(!images.includes(url))images.push(url);}catch{/* Ignore unrelated links in the chat reply. */}
 }
 return images.slice(0,4);
}
export function generateOttoImage({key,prompt,requestId,confirm,history=[],conversationId,selectedImage}){
 if(typeof key!=='string'||!/^ak_[!-~]{5,300}$/.test(key))fail(401,'Enter your HeyOtto API key. It begins with ak_.');
 if(confirm!==true)fail(400,'Choose Generate image to request a new image.');
 if(typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId))fail(400,'Refresh the page before requesting an image.');
 let messages;try{messages=imageMessages(prompt);}catch(e){fail(400,e.message);}
 if(!Array.isArray(history)||history.length>100||history.some(m=>!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>20000)||JSON.stringify(history).length>200000)fail(400,'This image conversation is too long. Start a new image conversation.');
 if(conversationId!==undefined&&(typeof conversationId!=='string'||!conversationId||conversationId.length>200))fail(400,'Invalid image conversation. Start a new conversation.');
 if(selectedImage)selectedImage=blobImageURL(selectedImage);
 if(history.length)messages=[...history,{role:'user',content:messages[0].content+'\nThis is a follow-up edit: keep the previous image and its style, changing only what the student requests.'+(selectedImage?'\nEdit this selected previous image: '+selectedImage:'')}];
 const fingerprint=createHash('sha256').update(key).digest('hex'),id=fingerprint+':'+requestId,signature=createHash('sha256').update(JSON.stringify({messages,conversationId})).digest('hex'),previous=requests.get(id);
 if(previous){if(previous.signature!==signature)fail(409,'This image request changed. Start a new request.');return previous.promise;}
 for(const [id,entry] of requests)if(entry.finished&&Date.now()-entry.created>15*60*1000)requests.delete(id);
 if(requests.size>=128)fail(429,'Image generation is busy. Please try later.');
 const entry={signature,created:Date.now(),finished:false};
 entry.promise=(async()=>{
  try{
   let response;try{response=await fetch('https://api.chat.heyotto.app/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({model:'heyotto',messages,stream:false,...(conversationId?{conversation_id:conversationId}:{})}),signal:AbortSignal.timeout(180000)});}catch{fail(504,'HeyOtto has not replied yet. It may still be creating your image. Check HeyOtto before generating again. This request was not automatically repeated.');}
   if(!response.ok)fail(response.status===401||response.status===403?401:502,response.status===401||response.status===403?'HeyOtto rejected that API key. Check your key and account access.':response.status===429?'HeyOtto is busy or limiting requests. Wait before trying again.':'HeyOtto could not complete the image request. Check your HeyOtto account before generating again.');
   const data=await response.json().catch(()=>null),images=extractBlobImages(data?.choices?.[0]?.message?.content);
   const content=data?.choices?.[0]?.message?.content;
   const reply=typeof content==='string'?content:Array.isArray(content)?content.filter(p=>p.type==='text').map(p=>p.text||'').join('\n'):'';
   if(!reply.trim()||reply.length>20000)fail(422,'HeyOtto did not return a readable reply. Check HeyOtto before generating again.');
   return {images,reply,history:[...messages,{role:'assistant',content:reply}],...(typeof data.conversation_id==='string'?{conversationId:data.conversation_id}:{})};
  }finally{entry.finished=true;}
 })();requests.set(id,entry);return entry.promise;
}
export function imageType(buffer){
 if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {type:'image/png',ext:'png'};
 if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return {type:'image/jpeg',ext:'jpg'};
 if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return {type:'image/webp',ext:'webp'};
 fail(400,'Choose a PNG, JPEG or WebP image.');
}
export async function downloadOttoImage(value){
 const url=blobImageURL(value);let response;
 try{response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(45000)});}catch{fail(502,'The image could not be downloaded. Its link may have expired. Keep the preview and try sending it again; no new image was requested.');}
 if(!response.ok)fail(502,'The HeyOtto image link is unavailable. No new image was requested.');
 const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>10*1024*1024)fail(413,'This image is too large. Choose an image smaller than 10 MB.');chunks.push(chunk);}
 const buffer=Buffer.concat(chunks);return {buffer,...imageType(buffer)};
}
