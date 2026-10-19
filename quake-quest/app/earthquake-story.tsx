import {useEffect,useRef} from 'react';
import {quakeMeaning,depthMeaning} from './quake-facts';
const safePlace=(value:string)=>value&&value.length<=120&&!/https?:|www\.|[<>{};=]|openstreetmap|javascript|function\s*\(|displaying the map/i.test(value)?value:'BGS recorded';
type Earthquake={place:string;time:string;lat:number;lon:number;depth:number;magnitude:number;link:string};
export default function EarthquakeStory({answer,onClose,onNext}:{answer:Earthquake;onClose:()=>void;onNext:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),meaning=quakeMeaning(answer.magnitude);
 useEffect(()=>{dialog.current?.showModal()},[]);
 return <dialog ref={dialog} className="earthquake-story-dialog" aria-labelledby="earthquake-story-title" onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><article className="quake-story">
 <button className="story-close" aria-label="Close earthquake details" onClick={onClose}>×</button><div className="real-badge"><span className="live-dot"/> BGS EARTHQUAKE</div><div className="story-emoji">{meaning.emoji}</div><div className="story-kicker">CASE DISCOVERED</div><h2 id="earthquake-story-title">The {safePlace(answer.place)} earthquake</h2><p className="story-time">It happened on {new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(answer.time))} UTC</p>
 <div className="story-numbers"><div><small>MAGNITUDE</small><strong>{answer.magnitude.toFixed(1)}</strong><span>{meaning.label}</span></div><div><small>DEPTH</small><strong>{answer.depth} km</strong><span>below ground</span></div></div>
 <div className="science-card"><b>🌍 What might that feel like?</b><p>{meaning.message}</p><small>Magnitude measures the quake at its source. What people actually feel also depends on distance, depth, local ground and buildings.</small></div>
 <div className="science-card depth-card"><b>⬇️ Down below</b><p>{depthMeaning(answer.depth)}</p></div><p className="energy-fact">⚡ One whole magnitude step means about <b>32× more energy.</b></p>
 <div className="story-source"><small>{answer.lat.toFixed(3)}°, {answer.lon.toFixed(3)}°</small><a href={answer.link} target="_blank" rel="noreferrer">See the BGS record ↗</a></div><div className="story-buttons"><button onClick={onClose}>SEE IT ON THE MAP</button><button onClick={onNext}>NEXT MISSION →</button></div>
 </article></dialog>;
}
