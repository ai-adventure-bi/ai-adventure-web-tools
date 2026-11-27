import {withBase} from './base-path.mjs';
export async function api(path,options={}){
 const controller=typeof AbortController==='function'?new AbortController():null;
 const timer=controller?setTimeout(()=>controller.abort(),/\/(assist|question)$/.test(path)?260000:20000):null;
 try{
  const response=await fetch(withBase('/api'+path),{...options,signal:options.signal||controller?.signal,headers:{'content-type':'application/json'},body:options.body?JSON.stringify(options.body):undefined});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Something went wrong.');return data;
 }catch(error){if(error?.name==='AbortError')throw new Error('This request took too long. Your last saved version is safe. Try again when the connection is ready.');throw error;}
 finally{if(timer)clearTimeout(timer);}
}
export const post=(path,body={})=>api(path,{method:'POST',body});
