const cleanCode = (value, max) => typeof value === 'string' && new RegExp(`^[A-Z0-9?*]{1,${max}}$`).test(value.toUpperCase()) ? value.toUpperCase() : '';

export default async function handler(request, response) {
  if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).json({ message: 'Method not allowed' }); }
  const network = cleanCode(request.query.network, 2), station = cleanCode(request.query.station, 5);
  if (!network || !station) return response.status(400).json({ source: 'unavailable', message: 'Invalid station code' });
  const eventMs = typeof request.query.eventTime === 'string' ? Date.parse(request.query.eventTime) : NaN;
  const isEvent = Number.isFinite(eventMs) && eventMs > Date.now() - 366 * 86400000 && eventMs < Date.now() + 86400000;
  const end = isEvent ? new Date(eventMs + 105000) : new Date(Date.now() - 60000);
  const start = isEvent ? new Date(eventMs - 15000) : new Date(end.getTime() - 3600000);
  const cacheSeconds = isEvent ? 86400 : 45;
  for (const channel of ['SHZ', 'HHZ', 'BHZ', 'EHZ', 'CHZ', 'LHZ']) {
    const query = new URLSearchParams({ network, station, location: '*', channel, starttime: start.toISOString(), endtime: end.toISOString(), nodata: '404' });
    try {
      const upstream = await fetch(`https://eida.bgs.ac.uk/fdsnws/dataselect/1/query?${query}`, { headers: { 'User-Agent': 'AI-Adventure-QuakeQuest/1.0 educational project', Accept: 'application/vnd.fdsn.mseed' }, signal: AbortSignal.timeout(16000) });
      if (!upstream.ok) continue;
      const body = Buffer.from(await upstream.arrayBuffer()); if (!body.length || body.length > 8_000_000) continue;
      response.setHeader('Content-Type', 'application/vnd.fdsn.mseed');
      response.setHeader('Cache-Control', `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, stale-while-revalidate=300`);
      response.setHeader('X-QuakeQuest-Channel', channel); response.setHeader('X-QuakeQuest-Start', start.toISOString()); response.setHeader('X-QuakeQuest-End', end.toISOString());
      return response.status(200).send(body);
    } catch {}
  }
  return response.status(404).json({ source: 'unavailable', message: 'No waveform was returned' });
}
