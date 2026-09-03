import { NextRequest, NextResponse } from 'next/server';

type Feature={tags?:Record<string,string>;lat?:number;lon?:number;center?:{lat:number;lon:number};geometry?:Array<{lat:number;lon:number}>};
type Point={lat:number;lon:number};
const rad=(n:number)=>n*Math.PI/180;
const distanceKm=(a:Point,b:Point)=>{const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))};
const featureDistance=(origin:Point,feature:Feature)=>{const points=feature.geometry?.length?feature.geometry:feature.center?[feature.center]:Number.isFinite(feature.lat)&&Number.isFinite(feature.lon)?[{lat:feature.lat!,lon:feature.lon!}]:[];return points.length?Math.min(...points.map(point=>distanceKm(origin,point))):Infinity};

export async function GET(request:NextRequest){
 const lat=Number(request.nextUrl.searchParams.get('lat')),lon=Number(request.nextUrl.searchParams.get('lon'));
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return NextResponse.json({error:'Invalid coordinates'},{status:400});
 const query=`[out:json][timeout:18];(way(around:2500,${lat},${lon})[highway~"^(motorway|trunk|primary|secondary)$"];way(around:1800,${lat},${lon})[railway=rail];nwr(around:1200,${lat},${lon})[landuse~"^(residential|commercial|retail|industrial)$"];nwr(around:3000,${lat},${lon})[aeroway~"^(aerodrome|runway)$"];nwr(around:1800,${lat},${lon})[landuse=quarry];);out tags center geom;`;
 try{
  const response=await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,{headers:{'User-Agent':'QuakeQuest/1.0 educational project'},signal:AbortSignal.timeout(20000),next:{revalidate:604800}});
  if(!response.ok)throw new Error('Map lookup unavailable');
  const data=await response.json() as {elements?:Feature[]};const features=data.elements||[],origin={lat,lon};
  const roads=features.filter(f=>f.tags?.highway).map(f=>({...f,distance:featureDistance(origin,f)})).sort((a,b)=>a.distance-b.distance);
  const railways=features.filter(f=>f.tags?.railway==='rail').map(f=>featureDistance(origin,f)).sort((a,b)=>a-b);
  const urban=features.filter(f=>['residential','commercial','retail'].includes(f.tags?.landuse||''));const industrial=features.filter(f=>['industrial','quarry'].includes(f.tags?.landuse||''));const airports=features.filter(f=>f.tags?.aeroway);
  const nearestRoad=roads[0],roadType=nearestRoad?.tags?.highway,roadDistance=nearestRoad?Math.round(nearestRoad.distance*1000):null;
  const roadRisk=!nearestRoad?'low':roadDistance!>1500?'low':roadType==='motorway'||roadType==='trunk'?(roadDistance!<500?'high':'medium'):(roadDistance!<250?'high':'medium');
  const urbanLevel=urban.length>=4?'high':urban.length?'medium':'low';const risks=[roadRisk,urbanLevel,railways[0]!=null&&railways[0]<.5?'high':railways[0]!=null&&railways[0]<1.5?'medium':'low',industrial.length||airports.length?'medium':'low'];const noiseRisk=risks.includes('high')?'high':risks.filter(r=>r==='medium').length>=2?'medium':'low';
  return NextResponse.json({available:true,noiseRisk,urbanLevel,road:nearestRoad?{type:roadType,name:nearestRoad.tags?.name||nearestRoad.tags?.ref||roadType,distanceM:roadDistance}:null,railwayDistanceM:railways[0]!=null?Math.round(railways[0]*1000):null,industrialNearby:industrial.length>0,airportNearby:airports.length>0,note:'Map-based noise risk, not a measured signal'});
 }catch{return NextResponse.json({available:false,noiseRisk:'unknown',urbanLevel:'unknown',road:null,railwayDistanceM:null,industrialNearby:false,airportNearby:false,note:'Surroundings lookup is temporarily unavailable'})}
}
