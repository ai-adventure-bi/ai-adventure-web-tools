import { NextRequest, NextResponse } from 'next/server';
const cleanCode=(value:string|null,max:number)=>value&&new RegExp(`^[A-Z0-9?*]{1,${max}}$`).test(value.toUpperCase())?value.toUpperCase():'';

export async function GET(request:NextRequest){
 const network=cleanCode(request.nextUrl.searchParams.get('network'),2),station=cleanCode(request.nextUrl.searchParams.get('station'),5);
 if(!network||!station)return NextResponse.json({source:'unavailable',message:'Invalid station code'},{status:400});
 const eventValue=request.nextUrl.searchParams.get('eventTime'),eventMs=eventValue?Date.parse(eventValue):NaN,isEvent=Number.isFinite(eventMs);const end=isEvent?new Date(eventMs+105_000):new Date(Date.now()-60_000),start=isEvent?new Date(eventMs-15_000):new Date(end.getTime()-60*60_000),cacheSeconds=isEvent?86400:45;const channels=['SHZ','HHZ','BHZ','EHZ','CHZ','LHZ'];
 for(const channel of channels){
  const query=new URLSearchParams({network,station,location:'*',channel,starttime:start.toISOString(),endtime:end.toISOString(),nodata:'404'});
  try{
   const response=await fetch(`https://eida.bgs.ac.uk/fdsnws/dataselect/1/query?${query}`,{headers:{'User-Agent':'QuakeQuest/1.0 educational project','Accept':'application/vnd.fdsn.mseed'},signal:AbortSignal.timeout(16000),next:{revalidate:cacheSeconds}});
   if(!response.ok)continue;
   const body=await response.arrayBuffer();if(!body.byteLength)continue;
   return new NextResponse(body,{headers:{'Content-Type':'application/vnd.fdsn.mseed','Cache-Control':`public, max-age=${cacheSeconds}`,'X-QuakeQuest-Channel':channel,'X-QuakeQuest-Start':start.toISOString(),'X-QuakeQuest-End':end.toISOString(),'X-QuakeQuest-Window':isEvent?'event':'latest'}});
  }catch{}
 }
 return NextResponse.json({source:'unavailable',network,station,message:isEvent?'No vertical waveform was returned for this event-time window':'No recent vertical waveform was returned by BGS',start:start.toISOString(),end:end.toISOString()});
}
