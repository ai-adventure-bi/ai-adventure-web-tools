const upstreamHeaders = { 'User-Agent': 'AI-Adventure-QuakeQuest/1.0 educational project' };

const decode = (value) => value.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (xml, name) => {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decode(match[1]) : '';
};
const numberFrom = (text, patterns, fallback = 0) => {
  for (const pattern of patterns) { const match = text.match(pattern); if (match) return Number(match[1]); }
  return fallback;
};

function parseEvents(xml) {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match, index) => {
    const item = match[1], title = tag(item, 'title'), description = tag(item, 'description'), text = `${title} ${description}`;
    const lat = numberFrom(item, [/<geo:lat[^>]*>([-+\d.]+)/i, /<georss:point[^>]*>\s*([-+\d.]+)/i], NaN);
    const lon = numberFrom(item, [/<geo:long[^>]*>([-+\d.]+)/i, /<geo:lon[^>]*>([-+\d.]+)/i, /<georss:point[^>]*>\s*[-+\d.]+\s+([-+\d.]+)/i], NaN);
    const magnitude = numberFrom(text, [/(?:magnitude|mag(?:nitude)?|ML)\s*[:=]?\s*([-+\d.]+)/i, /\bM\s*([-+\d.]+)/i]);
    const depth = numberFrom(text, [/depth\s*[:=]?\s*([-+\d.]+)/i]);
    const titlePlace = title.match(/:\s*([^:]+?),\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),/i)?.[1];
    const rawPlace = (titlePlace || text.match(/(?:locality|region|location)\s*[:=]?\s*([^;|<]+)/i)?.[1] || title || `UK earthquake ${index + 1}`).trim();
    const place = rawPlace.replace(/\b(?:magnitude|mag|depth|lat|lon).*$/i, '').trim() || title;
    const link = tag(item, 'link') || 'https://www.quakes.bgs.ac.uk/earthquakes/recent_uk_events.html';
    const time = tag(item, 'pubDate') || text.match(/\b20\d\d[-/]\d\d[-/]\d\d[^,;|]*/)?.[0] || '';
    return { id: link || `${lat}-${lon}-${time}`, title: title || place, place, lat, lon, magnitude, depth, time, link };
  }).filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lon));
}

function parseStations(text) {
  const unique = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.split('|'); if (parts.length < 6) continue;
    const station = { network: parts[0].trim(), code: parts[1].trim(), lat: Number(parts[2]), lon: Number(parts[3]), elevation: Number(parts[4]), name: parts[5].trim() || parts[1].trim() };
    if (station.code && Number.isFinite(station.lat) && Number.isFinite(station.lon)) unique.set(`${station.network}.${station.code}`, station);
  }
  return [...unique.values()];
}

async function fetchText(url, timeout) {
  const response = await fetch(url, { headers: upstreamHeaders, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  return response.text();
}

export default async function handler(request, response) {
  if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).json({ message: 'Method not allowed' }); }
  try {
    const [eventXml, stationText] = await Promise.all([
      fetchText('https://quakes.bgs.ac.uk/feeds/MhSeismology.xml', 8000),
      fetchText('https://eida.bgs.ac.uk/fdsnws/station/1/query?network=GB&level=station&format=text&nodata=404', 12000),
    ]);
    const events = parseEvents(eventXml), stations = parseStations(stationText);
    if (!events.length || !stations.length) throw new Error('No usable upstream data');
    response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600, stale-if-error=86400');
    return response.status(200).json({ source: 'LIVE BGS XML FEED', stationSource: 'LIVE BGS EIDA STATIONS', updatedAt: new Date().toISOString(), events, stations });
  } catch {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(503).json({ message: 'Live earthquake data is temporarily unavailable' });
  }
}
