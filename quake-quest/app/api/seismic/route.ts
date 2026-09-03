import { NextResponse } from 'next/server';

type Quake={id:string;title:string;place:string;lat:number;lon:number;magnitude:number;depth:number;time:string;link:string};
type Station={network:string;code:string;name:string;lat:number;lon:number;elevation:number};
const fallback:Quake[]=[
 {id:'bontddu-20260812',title:'Bontddu, Gwynedd',place:'Bontddu, Gwynedd',lat:52.755,lon:-3.972,magnitude:1.3,depth:8,time:'2026-08-12T13:30:48.9Z',link:'https://www.quakes.bgs.ac.uk/earthquakes/recent_uk_events.html'},
 {id:'llangyndir-20260812',title:'Llangyndir, Powys',place:'Llangyndir, Powys',lat:51.852,lon:-3.203,magnitude:1.1,depth:6,time:'2026-08-12T03:22:26.6Z',link:'https://www.quakes.bgs.ac.uk/earthquakes/recent_uk_events.html'},
 {id:'north-sea-20260805',title:'Southern North Sea',place:'Southern North Sea',lat:54.254,lon:1.143,magnitude:2.1,depth:10,time:'2026-08-05T05:12:41.2Z',link:'https://www.quakes.bgs.ac.uk/earthquakes/recent_uk_events.html'},
 {id:'walsden-20260801',title:'Walsden, West Yorkshire',place:'Walsden, West Yorkshire',lat:53.697,lon:-2.108,magnitude:1.3,depth:6,time:'2026-08-01T10:40:53.8Z',link:'https://www.quakes.bgs.ac.uk/earthquakes/recent_uk_events.html'},
 {id:'central-north-sea-20260731',title:'Central North Sea',place:'Central North Sea',lat:57.004,lon:1.906,magnitude:3.2,depth:10,time:'2026-07-31T00:31:16.3Z',link:'https://www.quakes.bgs.ac.uk/earthquakes/recent_uk_events.html'}
];
const decode=(s:string)=>s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const tag=(xml:string,name:string)=>{const m=xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));return m?decode(m[1]):''};
const numberFrom=(text:string,patterns:RegExp[],fallbackValue=0)=>{for(const p of patterns){const m=text.match(p);if(m)return Number(m[1])}return fallbackValue};

function parseFeed(xml:string):Quake[]{
 return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match,index)=>{
  const item=match[1],title=tag(item,'title'),description=tag(item,'description'),text=`${title} ${description}`;
  const lat=numberFrom(item,[/<geo:lat[^>]*>([-+\d.]+)/i,/<georss:point[^>]*>\s*([-+\d.]+)/i],NaN);
  const lon=numberFrom(item,[/<geo:long[^>]*>([-+\d.]+)/i,/<geo:lon[^>]*>([-+\d.]+)/i,/<georss:point[^>]*>\s*[-+\d.]+\s+([-+\d.]+)/i],NaN);
  const magnitude=numberFrom(text,[/(?:magnitude|mag(?:nitude)?|ML)\s*[:=]?\s*([-+\d.]+)/i,/\bM\s*([-+\d.]+)/i]);
  const depth=numberFrom(text,[/depth\s*[:=]?\s*([-+\d.]+)/i]);
  const titlePlace=title.match(/:\s*([^:]+?),\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),/i)?.[1];
  const rawPlace=(titlePlace||text.match(/(?:locality|region|location)\s*[:=]?\s*([^;|<]+)/i)?.[1]||title||`UK earthquake ${index+1}`).trim();
  const place=rawPlace.replace(/\b(?:magnitude|mag|depth|lat|lon).*$/i,'').trim()||title;
  const link=tag(item,'link')||'https://www.quakes.bgs.ac.uk/earthquakes/recent_uk_events.html';
  const time=tag(item,'pubDate')||text.match(/\b20\d\d[-/]\d\d[-/]\d\d[^,;|]*/)?.[0]||'';
  return {id:link||`${lat}-${lon}-${time}`,title:title||place,place,lat,lon,magnitude,depth,time,link};
 }).filter(q=>Number.isFinite(q.lat)&&Number.isFinite(q.lon));
}

function parseStations(text:string):Station[]{
 const unique=new Map<string,Station>();
 for(const line of text.split(/\r?\n/)){
  if(!line.trim()||line.startsWith('#'))continue;
  const parts=line.split('|');if(parts.length<6)continue;
  const station={network:parts[0].trim(),code:parts[1].trim(),lat:Number(parts[2]),lon:Number(parts[3]),elevation:Number(parts[4]),name:parts[5].trim()||parts[1].trim()};
  if(station.code&&Number.isFinite(station.lat)&&Number.isFinite(station.lon))unique.set(`${station.network}.${station.code}`,station);
 }
 return [...unique.values()];
}

export async function GET(){
 const headers={'User-Agent':'QuakeQuest/1.0 educational project'};
 const [eventResult,stationResult]=await Promise.allSettled([
  fetch('https://quakes.bgs.ac.uk/feeds/MhSeismology.xml',{headers,signal:AbortSignal.timeout(8000),next:{revalidate:300}}),
  fetch('https://eida.bgs.ac.uk/fdsnws/station/1/query?network=GB&level=station&format=text&nodata=404',{headers,signal:AbortSignal.timeout(12000),next:{revalidate:3600}})
 ]);
 let events=fallback,source='BGS FALLBACK SNAPSHOT';
 if(eventResult.status==='fulfilled'&&eventResult.value.ok){const parsed=parseFeed(await eventResult.value.text());if(parsed.length){events=parsed;source='LIVE BGS XML FEED'}}
 let stations:Station[]=[],stationSource='BGS EIDA UNAVAILABLE';
 if(stationResult.status==='fulfilled'&&stationResult.value.ok){stations=parseStations(await stationResult.value.text());if(stations.length)stationSource='LIVE BGS EIDA STATIONS'}
 return NextResponse.json({source,stationSource,updatedAt:new Date().toISOString(),events,stations});
}
