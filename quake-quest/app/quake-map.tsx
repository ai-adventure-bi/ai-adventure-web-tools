'use client';

import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

export type MapStation={network:string;code:string;name:string;lat:number;lon:number;elevation:number;color:string;distance:number;delay:number};
type Point={lat:number;lon:number};

function ClickHandler({disabled,onGuess}:{disabled:boolean;onGuess:(point:Point)=>void}){
  useMapEvents({click(e){const target=e.originalEvent.target as Element|null;if(target?.closest?.('.leaflet-interactive'))return;if(!disabled)onGuess({lat:e.latlng.lat,lon:e.latlng.lng})}});return null;
}
function ResetView({missionKey}:{missionKey:string}){const map=useMap();useEffect(()=>{map.fitBounds(L.latLngBounds([48.1,-11.8],[61.2,4.2]),{padding:[26,26]})},[map,missionKey]);return null}

export default function QuakeMap({stations,nearestCodes,showAll,selected,onSelect,guess,onGuess,target,revealed,missionKey,simulation=false,explorer=false,activeCodes=[],pWaveRadiusKm=0,sWaveRadiusKm=0,selectedCode,allowOtherSelection=false,clueRings=[]}:{stations:MapStation[];nearestCodes:string[];showAll:boolean;selected:number;onSelect:(code:string)=>void;guess:Point|null;onGuess:(p:Point)=>void;target:Point;revealed:boolean;missionKey:string;simulation?:boolean;explorer?:boolean;activeCodes?:string[];pWaveRadiusKm?:number;sWaveRadiusKm?:number;selectedCode?:string;allowOtherSelection?:boolean;clueRings?:Array<{lat:number;lon:number;distance:number;color:string;code:string}>}){
  const guessIcon=L.divIcon({className:'guess-marker-wrap',html:'<span class="guess-marker"><i></i></span>',iconSize:[34,46],iconAnchor:[17,43]});
  return <MapContainer className="leaflet-map" center={[54.5,-3]} zoom={5} minZoom={2} maxZoom={15} worldCopyJump zoomControl={false}>
    <ZoomControl position="topright"/>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
    <ResetView missionKey={missionKey}/><ClickHandler disabled={revealed&&!simulation} onGuess={onGuess}/>
    {simulation&&pWaveRadiusKm>0&&<><Circle center={[target.lat,target.lon]} radius={pWaveRadiusKm*1000} pathOptions={{color:'#4db9ff',weight:3,fill:false,opacity:.75,dashArray:'8 8'}}/><Circle center={[target.lat,target.lon]} radius={sWaveRadiusKm*1000} pathOptions={{color:'#ff725c',weight:5,fill:false,opacity:.8}}/></>}
    {!simulation&&clueRings.map(r=><Circle key={`clue-${r.code}`} interactive={false} center={[r.lat,r.lon]} radius={Math.max(2500,r.distance*1000)} pathOptions={{color:r.color,weight:3,fill:true,fillColor:r.color,fillOpacity:.055,opacity:.8,dashArray:'9 7'}}/>)}
    {stations.filter(s=>showAll||nearestCodes.includes(`${s.network}.${s.code}`)).map(s=>{const code=`${s.network}.${s.code}`,isNearest=nearestCodes.includes(code),isSelected=(selectedCode||nearestCodes[selected])===code,isActive=activeCodes.includes(code),canInspect=isNearest||allowOtherSelection||explorer;return <CircleMarker key={code} center={[s.lat,s.lon]} radius={isSelected?12:explorer?8:isNearest?(simulation?7:9):7} pathOptions={{color:isSelected?'#ffd052':explorer?'#fff':isNearest?'#fff':'#60747b',weight:isSelected?4:explorer?3:isNearest?(simulation?2:4):1.5,fillColor:explorer?'#16b8aa':isActive?s.color:isNearest&&simulation?'#a7b5b8':isNearest?s.color:'#70848c',fillOpacity:explorer?.9:isSelected&&!isNearest?.78:isNearest?1:.56,opacity:isSelected?1:isNearest||explorer?1:.82}} eventHandlers={{click:event=>{L.DomEvent.stopPropagation(event.originalEvent);if(canInspect)onSelect(code)}}}><Tooltip direction="top" offset={[0,-7]} opacity={1}><b>{s.code}</b> · {s.name}<br/>{explorer?`${Math.round(s.elevation)} m elevation · tap to inspect`:`${s.distance} km from epicentre`}{simulation&&isNearest&&<><br/><em>{isActive?'Wave detected—tap to inspect':'Waiting for wave'}</em></>}{!explorer&&!isNearest&&<><br/><em>{simulation?'Outside estimated detection range':isSelected?'Selected · waveform below':'Other BGS station · tap to inspect'}</em></>}</Tooltip></CircleMarker>})}
    {guess&&<Marker position={[guess.lat,guess.lon]} icon={guessIcon}><Tooltip permanent direction="bottom" offset={[0,0]} opacity={1}><b>{simulation?'YOUR EPICENTRE':'YOUR GUESS'}</b></Tooltip></Marker>}
    {revealed&&!simulation&&!explorer&&<CircleMarker center={[target.lat,target.lon]} radius={16} pathOptions={{color:'#fff',weight:5,fillColor:'#ff604b',fillOpacity:1}}><Tooltip permanent direction="top" offset={[0,-14]} opacity={1}><b>⚡ EPICENTRE</b></Tooltip></CircleMarker>}
  </MapContainer>
}
