'use client';
import {useEffect,useRef,useState} from 'react';
import type {Picks,Point} from './investigation-math';
export type Phase={arrival_s:number|null;plausible_interval_s:[number,number]|null;confidence:'high'|'medium'|'low'|'unresolved';evidence:string};
export type Prediction={location:(Point&{fit_rms_km:number;ambiguous:boolean})|null;mapping:{station_id:string;code:string}[];window:{start:number;span:number};limitations:string[];phases:{stations:{station_id:string;p:Phase;s:Phase}[];limitations:string[];cross_station_consistency:string}};
type Round={id:string;status:'investigating'|'ready'|'unavailable';message:string;locked:boolean};
export async function ottoApi<T>(path:string,body?:unknown):Promise<T>{const r=await fetch('/api/quake-quest/heyotto/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(35000)});let data;try{data=await r.json()}catch{throw Error('Start the updated Quake Quest server to connect HeyOtto.')}if(!r.ok)throw Object.assign(Error((data as {error?:string}).error||'HeyOtto is unavailable.'),{status:r.status});return data as T}
export function useHeyOtto(caseId:string,roundKey:string,stations:{code:string}[],locked:boolean){
 const [connected,setConnected]=useState(false),[open,setOpen]=useState(true),[round,setRound]=useState<Round|null>(null);
 const active=useRef(roundKey);active.current=roundKey;const run=useRef<{key:string;promise:Promise<boolean>;committed:boolean}|null>(null);
 useEffect(()=>{let live=true;ottoApi<{connected:boolean}>('status').then(s=>{if(live){setConnected(s.connected);if(s.connected)setOpen(false)}}).catch(()=>{});return()=>{live=false}},[]);
 useEffect(()=>{run.current=null;setRound(null)},[roundKey]);
 const codes=stations.slice(0,3).map(s=>s.code).join('|');
 useEffect(()=>{
  if(!connected||locked||!caseId||stations.length<3||run.current?.key===roundKey)return;
  const initial={id:roundKey,status:'investigating' as const,message:'HeyOtto is preparing the recordings…',locked:false};setRound(initial);
  const promise=ottoApi<Round>('start',{case:caseId,round:roundKey,stations:codes.split('|')}).then(r=>{if(active.current===roundKey)setRound(r);return true}).catch(e=>{if(active.current===roundKey)setRound({...initial,status:'unavailable',message:e.message});return false});
  run.current={key:roundKey,promise,committed:false};
 },[connected,locked,caseId,roundKey,codes,stations.length]);
 useEffect(()=>{
  if(!round||round.status!=='investigating')return;
  let stopped=false;const key=round.id;
  const timer=setInterval(()=>ottoApi<Round>('round?id='+encodeURIComponent(key)).then(r=>{if(!stopped&&active.current===key)setRound(r)}).catch(e=>{if(!stopped&&active.current===key)setRound({id:key,status:'unavailable',locked:false,message:e.message})}),2500);
  return()=>{stopped=true;clearInterval(timer)};
 },[round?.id,round?.status]);
 async function commit(guess:Point,picks:Record<string,Picks>,count:number){const task=run.current;if(!task||task.key!==roundKey||!await task.promise)return false;if(active.current!==roundKey)return false;try{await ottoApi('submit',{round:roundKey,guess,picks,count});task.committed=true;return true}catch(e){if([401,404].includes((e as {status?:number}).status||0))return false;throw e}}
 async function disconnect(){await ottoApi('disconnect',{});setConnected(false);setOpen(false);setRound(r=>r?{...r,status:'unavailable',message:'HeyOtto disconnected. Reconnect for the next case.'}:null)}
 return {connected,open,setOpen,round,commit,disconnect,onConnected:()=>{setConnected(true);setOpen(false)}};
}
export function OttoConnection({open,connected,onClose,onConnected,onDisconnect}:{open:boolean;connected:boolean;onClose:()=>void;onConnected:()=>void;onDisconnect:()=>Promise<void>}){
 const [key,setKey]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(open)dialog.current?.showModal();else{dialog.current?.close();setKey('');setError('')}},[open]);
 return <dialog className="otto-dialog" ref={dialog} onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await ottoApi('connect',{key});setKey('');onConnected()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>
 <div className="eyebrow">HEYOTTO / FELLOW INVESTIGATOR</div><h2>REQUESTING ASSISTANCE:<br/>Earthquake investigation.</h2><p>Investigate earthquakes alongside HeyOtto! You’ll both analyse the same seismic recordings independently, then compare your predictions when the earthquake is revealed.</p>
 {connected?<><p className="otto-connected">● Connected through the HeyOtto API</p><button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{await onDisconnect()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>Disconnect HeyOtto</button><button type="button" onClick={onClose}>Return to investigation</button></>:<><label htmlFor="otto-key">Your personal HeyOtto API key</label><div className="otto-key-input"><input id="otto-key" type={show?'text':'password'} value={key} onChange={e=>setKey(e.target.value)} autoComplete="off" spellCheck={false} disabled={busy}/><button type="button" aria-pressed={show} onClick={()=>setShow(v=>!v)}>{show?'Hide':'Show'}</button></div><small>Your key stays in this server’s memory for the session, not browser storage. This authenticates API access; it does not log you into the HeyOtto website. Waveform requests are saved as conversations by HeyOtto.</small><button className="otto-connect" disabled={busy||!key.trim()}>{busy?'Connecting…':'Connect HeyOtto'}</button><button type="button" disabled={busy} onClick={onClose}>Continue without HeyOtto</button></>}
 {error&&<p role="alert">{error}</p>}</form></dialog>
}
