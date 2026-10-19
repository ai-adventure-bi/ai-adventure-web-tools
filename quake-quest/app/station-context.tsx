'use client';
import {useEffect,useState,useRef} from 'react';
export type BgsStation={network:string;code:string;name:string;lat:number;lon:number;elevation:number};
export type StationEnvironment={available:boolean;noiseRisk:'low'|'medium'|'high'|'unknown';urbanLevel:'low'|'medium'|'high'|'unknown';road:{type:string;name:string;distanceM:number}|null;railwayDistanceM:number|null;industrialNearby:boolean;airportNearby:boolean;note:string};
export const stationKey=(station:BgsStation)=>`${station.network}.${station.code}`;
export function useStationEnvironments(stations:BgsStation[],delayMs=0){
 const requested=useRef(new Set<string>());const [environments,setEnvironments]=useState<Record<string,StationEnvironment>>({});const [loading,setLoading]=useState<Record<string,boolean>>({});const codes=stations.map(stationKey).join('|');
 useEffect(()=>{const timer=setTimeout(()=>stations.forEach(s=>{
  const key=stationKey(s);if(requested.current.has(key))return;requested.current.add(key);
  setLoading(v=>({...v,[key]:true}));
  fetch(`/api/quake-quest/station-environment?lat=${s.lat}&lon=${s.lon}`).then(r=>{if(!r.ok)throw Error();return r.json() as Promise<StationEnvironment>}).then(data=>setEnvironments(v=>({...v,[key]:data}))).catch(()=>setEnvironments(v=>({...v,[key]:{available:false,noiseRisk:'unknown',urbanLevel:'unknown',road:null,railwayDistanceM:null,industrialNearby:false,airportNearby:false,note:'Surroundings lookup is temporarily unavailable'}}))).finally(()=>setLoading(v=>({...v,[key]:false})));
 }),delayMs);return()=>clearTimeout(timer)},[codes,delayMs]);
 return {environments,loading};
}
const distanceText=(metres:number)=>metres<1000?`${metres} m`:`${(metres/1000).toFixed(1)} km`;
export function EnvironmentCard({station,environment,loading}:{station?:BgsStation;environment?:StationEnvironment;loading?:boolean}){if(!station)return null;return <div className="environment-card"><b>🔎 WHAT IS AROUND THIS STATION?</b>{loading?<span>Reading the map…</span>:environment?.available?<><span>{environment.urbanLevel==='high'?'🏙️ City surroundings':environment.urbanLevel==='medium'?'🏘️ Some built-up surroundings':'🌿 Mostly rural surroundings'}</span><span>{environment.road?`🚗 ${environment.road.name} about ${distanceText(environment.road.distanceM)} away`:'🚗 No major road within 2.5 km'}</span>{environment.railwayDistanceM!=null&&<span>🚆 Railway about {distanceText(environment.railwayDistanceM)} away</span>}{environment.industrialNearby&&<span>🏭 Industrial or quarry activity nearby</span>}{environment.airportNearby&&<span>✈️ Airfield activity nearby</span>}<em className={`risk-${environment.noiseRisk}`}>Predicted human-noise risk: {environment.noiseRisk}</em></>:<span>Surroundings data unavailable</span>}<small>{environment?.note||'Map estimate—not proof of noise in a recording.'}</small></div>}

export function StationPhoto({station}:{station:BgsStation}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[station.code]);const page=`https://earthquakes.bgs.ac.uk/data/station_book/stationbook_${encodeURIComponent(station.code.toLowerCase())}.html`;return <div className="station-photo">{failed?<div className="station-photo-missing">📡<b>No BGS photograph available</b></div>:<img loading="lazy" key={station.code} src={`/api/quake-quest/station-photo?station=${encodeURIComponent(station.code)}`} alt={`BGS photograph of ${station.name} seismic station`} onError={()=>setFailed(true)}/>}<a href={page} target="_blank" rel="noreferrer">Photo and station details: BGS ↗</a></div>}

