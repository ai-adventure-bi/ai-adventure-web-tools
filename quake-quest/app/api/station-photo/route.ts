import { NextRequest, NextResponse } from 'next/server';

export async function GET(request:NextRequest){
 const station=(request.nextUrl.searchParams.get('station')||'').toLowerCase();
 if(!/^[a-z0-9]{2,5}$/.test(station))return NextResponse.json({message:'Invalid station code'},{status:400});
 const pageUrl=`https://earthquakes.bgs.ac.uk/data/station_book/stationbook_${station}.html`;
 try{
  const page=await fetch(pageUrl,{headers:{'User-Agent':'QuakeQuest/1.0 educational project'},signal:AbortSignal.timeout(10000),next:{revalidate:86400}});
  if(!page.ok)throw new Error('Station page unavailable');
  const html=await page.text(),sources=[...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(match=>match[1]);
  const source=sources.find(src=>new RegExp(`(?:^|/)${station}(?:[_-][a-z0-9]+)?\\.(?:jpe?g|png)$`,'i').test(src));
  if(!source)throw new Error('No station photograph');
  const imageUrl=new URL(source,pageUrl);const image=await fetch(imageUrl,{headers:{'User-Agent':'QuakeQuest/1.0 educational project'},signal:AbortSignal.timeout(10000),next:{revalidate:86400}});
  if(!image.ok)throw new Error('Photograph unavailable');
  return new NextResponse(await image.arrayBuffer(),{headers:{'Content-Type':image.headers.get('content-type')||'image/jpeg','Cache-Control':'public, max-age=86400'}});
 }catch{return NextResponse.json({message:'No BGS photograph available'},{status:404})}
}
