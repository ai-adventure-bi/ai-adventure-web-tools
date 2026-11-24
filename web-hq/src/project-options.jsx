import {BASE_PATH} from './base-path.mjs';
import React,{useState,useEffect} from 'react';
export function AddressEditor({project,classSlug,onAddress,post}){
 const [slug,setSlug]=useState(project.slug),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setSlug(project.slug);setSaved(false);setError('');},[project.id,project.slug]);
 async function submit(e){e.preventDefault();setBusy(true);setSaved(false);setError('');try{const d=await post(`/projects/${project.id}/address`,{slug});onAddress(d.slug);setSlug(d.slug);setSaved(true);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <form className="address-editor" onSubmit={submit}><label htmlFor="website-address">Website address</label><div className="address-input-row"><span>{BASE_PATH}/c/{classSlug}/</span><input id="website-address" name="slug" disabled={busy} aria-label="Website address" value={slug} onChange={e=>{setSlug(e.target.value);setSaved(false);setError('');}} required maxLength={48} pattern="[a-z0-9]+(-[a-z0-9]+)*" autoCapitalize="none" spellCheck="false"/><button className="button" disabled={busy}>{busy?'Saving…':'Save address'}</button></div><p className={`address-save-state ${error?'address-error':''}`} role="status">{error||((saved||slug===project.slug)?'✓ Address saved':'Address not saved yet')}</p></form>;
}
export function PublicLeaderboard({id,api}){
 const [scores,setScores]=useState([]),[error,setError]=useState('');
 useEffect(()=>{api('/leaderboards/'+id).then(d=>setScores(d.scores)).catch(e=>setError(e.message));},[id]);
 return <main className="login-layout"><section className="login-card"><h1>Leaderboard</h1><p>Scores are saved from the game. Players only enter a nickname.</p>{scores.map((s,i)=><p key={s.id}>{i+1}. {s.name} — {s.score}</p>)}{!scores.length&&!error&&<p>No scores yet. Play the game to add one.</p>}{error&&<p className="error-box">{error}</p>}</section></main>;
}
