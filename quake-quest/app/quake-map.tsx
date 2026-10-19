'use client';

import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import {createPortal} from 'react-dom';
import 'leaflet/dist/leaflet.css';

export type MapStation={network:string;code:string;name:string;lat:number;lon:number;elevation:number;color:string;distance:number;delay:number};
type Point={lat:number;lon:number};

function ClickHandler({disabled,onGuess}:{disabled:boolean;onGuess:(point:Point)=>void}){
  useMapEvents({click(e){const target=e.originalEvent.target as Element|null;if(target?.closest?.('.leaflet-interactive'))return;if(!disabled)onGuess({lat:e.latlng.lat,lon:e.latlng.lng})}});return null;
}
function MapAppearance({original}:{original:boolean}){
 const map=useMap();useEffect(()=>{const node=map.getContainer();node.classList.toggle('map-original',original);node.classList.toggle('map-signal',!original)},[map,original]);return null;
}
function TargetCrosshair({point}:{point:Point}){
 const map=useMap();const [pixel,setPixel]=useState(()=>map.latLngToContainerPoint([point.lat,point.lon]));
 const update=()=>setPixel(map.latLngToContainerPoint([point.lat,point.lon]));
 useMapEvents({move:update,zoom:update,resize:update,viewreset:update});
 useEffect(update,[map,point.lat,point.lon]);
 const size=map.getSize();if(pixel.x<0||pixel.y<0||pixel.x>size.x||pixel.y>size.y)return null;
 return createPortal(<div className="target-crosshair" aria-hidden="true"><div className="target-axis horizontal" style={{top:pixel.y}}/><div className="target-axis vertical" style={{left:pixel.x}}/><div className="target-reticle" style={{left:pixel.x,top:pixel.y}}/><span className="target-coordinate" style={{left:Math.max(8,Math.min(pixel.x+24,size.x-215)),top:Math.max(8,Math.min(pixel.y+24,size.y-35))}}>TARGET / {point.lat.toFixed(3)}° {point.lon.toFixed(3)}°</span></div>,map.getContainer());
}
function StationBounds({stations,missionKey}:{stations:MapStation[];missionKey:string}){const map=useMap();const codes=stations.map(s=>s.code).join('|');useEffect(()=>{if(stations.length)map.fitBounds(L.latLngBounds(stations.map(s=>[s.lat,s.lon] as [number,number])),{padding:[65,65],maxZoom:9})},[map,missionKey,codes]);return null}
function ResetView({missionKey}:{missionKey:string}){const map=useMap();useEffect(()=>{map.fitBounds(L.latLngBounds([48.1,-11.8],[61.2,4.2]),{padding:[26,26]})},[map,missionKey]);return null}

function ResultBounds({guess,target,aiGuess}:{guess:Point|null;target:Point;aiGuess?:Point|null}){
 const map=useMap();useEffect(()=>{
  // Finish any station-selection zoom first: Leaflet ignores fitBounds while
  // a zoom transition is in progress, even when animate:false is requested.
  let timer:ReturnType<typeof setTimeout>;
  const fit=()=>{clearTimeout(timer);map.off('zoomend',fit);const points=[target,...(guess?[guess]:[]),...(aiGuess?[aiGuess]:[])];map.stop();map.invalidateSize({pan:false});map.fitBounds(L.latLngBounds(points.map(p=>[p.lat,p.lon] as [number,number])),{animate:false,paddingTopLeft:[35,95],paddingBottomRight:map.getSize().x>650?[Math.min(450,map.getSize().x*.55),40]:[25,Math.min(260,map.getSize().y*.58)],maxZoom:10})};
  map.once('zoomend',fit);timer=setTimeout(fit,350);
  return()=>{clearTimeout(timer);map.off('zoomend',fit)};
 },[map,guess?.lat,guess?.lon,target.lat,target.lon,aiGuess?.lat,aiGuess?.lon]);return null
}
export default function QuakeMap({stations,nearestCodes,showAll,selected,onSelect,guess,onGuess,target,revealed,missionKey,simulation=false,explorer=false,activeCodes=[],pWaveRadiusKm=0,sWaveRadiusKm=0,selectedCode,allowOtherSelection=false,clueRings=[],investigation=false,aiGuess,comparison=false}:{stations:MapStation[];nearestCodes:string[];showAll:boolean;selected:number;onSelect:(code:string)=>void;guess:Point|null;onGuess:(p:Point)=>void;target:Point;revealed:boolean;missionKey:string;simulation?:boolean;explorer?:boolean;activeCodes?:string[];pWaveRadiusKm?:number;sWaveRadiusKm?:number;selectedCode?:string;allowOtherSelection?:boolean;investigation?:boolean;aiGuess?:Point|null;comparison?:boolean;clueRings?:Array<{lat:number;lon:number;distance:number;color:string;code:string}>}){
  const [originalMap,setOriginalMap]=useState(false);
  const guessIcon=L.divIcon({className:'guess-marker-wrap',html:'<span class="target-centre"></span>',iconSize:[12,12],iconAnchor:[6,6]});
  return <MapContainer className={`leaflet-map ${originalMap?'map-original':'map-signal'}`} center={[54.5,-3]} zoom={5} minZoom={2} maxZoom={15} worldCopyJump zoomControl={false}>
    <MapAppearance original={originalMap}/><ZoomControl position="topright"/>
    <div className="map-view-control" ref={node=>{if(node){L.DomEvent.disableClickPropagation(node);L.DomEvent.disableScrollPropagation(node)}}}><button type="button" aria-label="Show original map colours" aria-pressed={originalMap} onClick={()=>setOriginalMap(v=>!v)}>{originalMap?'◈ Original map':'◈ Signal map'}<span>Switch view</span></button></div>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
    <>{investigation?(revealed?<ResultBounds guess={guess} target={target} aiGuess={aiGuess}/>:<StationBounds stations={stations} missionKey={missionKey}/>):<ResetView missionKey={missionKey}/>}</><ClickHandler disabled={revealed&&!simulation} onGuess={onGuess}/>
    {simulation&&pWaveRadiusKm>0&&<><Circle center={[target.lat,target.lon]} radius={pWaveRadiusKm*1000} pathOptions={{color:'#4db9ff',weight:3,fill:false,opacity:.75,dashArray:'8 8'}}/><Circle center={[target.lat,target.lon]} radius={sWaveRadiusKm*1000} pathOptions={{color:'#ff725c',weight:5,fill:false,opacity:.8}}/></>}
    {!simulation&&clueRings.map(r=><Circle key={`clue-${r.code}`} interactive={false} center={[r.lat,r.lon]} radius={Math.max(0,r.distance*1000)} pathOptions={{color:r.color,weight:3,fill:true,fillColor:r.color,fillOpacity:.055,opacity:.8,dashArray:'9 7'}}/>)}
    {stations.filter(s=>showAll||nearestCodes.includes(`${s.network}.${s.code}`)).map(s=>{const code=`${s.network}.${s.code}`,isNearest=nearestCodes.includes(code),isSelected=(selectedCode||nearestCodes[selected])===code,isActive=activeCodes.includes(code),canInspect=isNearest||allowOtherSelection||explorer;return <CircleMarker key={code} center={[s.lat,s.lon]} radius={isSelected?12:explorer?8:isNearest?(simulation?7:9):7} pathOptions={{color:isSelected?'#ffd052':explorer?'#fff':isNearest?'#fff':'#60747b',weight:isSelected?4:explorer?3:isNearest?(simulation?2:4):1.5,fillColor:explorer?'#16b8aa':isActive?s.color:isNearest&&simulation?'#a7b5b8':isNearest?s.color:'#70848c',fillOpacity:explorer?.9:isSelected&&!isNearest?.78:isNearest?1:.56,opacity:isSelected?1:isNearest||explorer?1:.82}} eventHandlers={{click:event=>{L.DomEvent.stopPropagation(event.originalEvent);if(canInspect)onSelect(code)}}}><Tooltip direction="top" offset={[0,-7]} opacity={1}><b>{s.name || s.code}</b><br/>{investigation?'Use your P–S picks for distance':explorer?`${Math.round(s.elevation)} m elevation · tap to inspect`:`${s.distance} km from epicentre`}{simulation&&isNearest&&<><br/><em>{isActive?'Wave detected — tap to inspect':'Waiting for wave'}</em></>}{!explorer&&!isNearest&&<><br/><em>{simulation?'Wave not yet detected':isSelected?'Selected · waveform below':'Other BGS station · tap to inspect'}</em></>}</Tooltip></CircleMarker>})}
    {guess&&!explorer&&!comparison&&<TargetCrosshair point={guess}/>}
    {guess&&(comparison?<CircleMarker center={[guess.lat,guess.lon]} radius={10} pathOptions={{color:'#fff',fillColor:'#f5c85d',fillOpacity:1,weight:3}}><Tooltip>Your guess</Tooltip></CircleMarker>:<Marker position={[guess.lat,guess.lon]} icon={guessIcon}/>)}
    {revealed&&aiGuess&&<Marker position={[aiGuess.lat,aiGuess.lon]} icon={L.divIcon({className:'otto-map-marker',html:'<span>◆</span>',iconSize:[26,26],iconAnchor:[13,13]})}><Tooltip>HeyOtto’s guess</Tooltip></Marker>}
    {comparison&&<div className="otto-map-legend" aria-label="Prediction legend"><span>● YOUR GUESS</span><span>◆ HEYOTTO’S GUESS{!aiGuess?' — unavailable':''}</span><span>✚ ACTUAL EARTHQUAKE</span></div>}
    {revealed&&!simulation&&!explorer&&<Marker position={[target.lat,target.lon]} icon={L.divIcon({className:'actual-quake-marker',html:'<span>✚</span>',iconSize:[32,32],iconAnchor:[16,16]})}><Tooltip permanent={!comparison} direction="top" offset={[0,-14]} opacity={1}><b>ACTUAL EARTHQUAKE</b></Tooltip></Marker>}
  </MapContainer>
}
