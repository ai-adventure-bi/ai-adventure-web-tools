export default async function handler(request, response) {
  if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).json({ message: 'Method not allowed' }); }
  const station = typeof request.query.station === 'string' ? request.query.station.toLowerCase() : '';
  if (!/^[a-z0-9]{2,5}$/.test(station)) return response.status(400).json({ message: 'Invalid station code' });
  const pageUrl = `https://earthquakes.bgs.ac.uk/data/station_book/stationbook_${station}.html`;
  try {
    const page = await fetch(pageUrl, { headers: { 'User-Agent': 'AI-Adventure-QuakeQuest/1.0 educational project' }, signal: AbortSignal.timeout(10000) });
    if (!page.ok) throw new Error();
    const html = await page.text();
    const sources = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]);
    const source = sources.find((src) => new RegExp(`(?:^|/)${station}(?:[_-][a-z0-9]+)?\\.(?:jpe?g|png)$`, 'i').test(src));
    if (!source) throw new Error();
    const imageUrl = new URL(source, pageUrl);
    if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'earthquakes.bgs.ac.uk') throw new Error();
    const image = await fetch(imageUrl, { headers: { 'User-Agent': 'AI-Adventure-QuakeQuest/1.0 educational project' }, signal: AbortSignal.timeout(10000) });
    const contentType = image.headers.get('content-type') || '';
    if (!image.ok || !/^image\/(?:jpeg|png)$/i.test(contentType)) throw new Error();
    const body = Buffer.from(await image.arrayBuffer()); if (!body.length || body.length > 5_000_000) throw new Error();
    response.setHeader('Content-Type', contentType); response.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    return response.status(200).send(body);
  } catch { return response.status(404).json({ message: 'No BGS photograph available' }); }
}
