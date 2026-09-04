import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, '..', 'public', 'data', 'seismic.json');
const headers = { 'User-Agent': 'AI-Adventure-QuakeQuest/1.0 educational project' };

const decode = (value) => value
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const tag = (xml, name) => {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decode(match[1]) : '';
};
const numberFrom = (text, patterns, fallback = 0) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return fallback;
};

function parseEvents(xml) {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match, index) => {
    const item = match[1];
    const title = tag(item, 'title');
    const description = tag(item, 'description');
    const text = `${title} ${description}`;
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
    const parts = line.split('|');
    if (parts.length < 6) continue;
    const station = { network: parts[0].trim(), code: parts[1].trim(), lat: Number(parts[2]), lon: Number(parts[3]), elevation: Number(parts[4]), name: parts[5].trim() || parts[1].trim() };
    if (station.code && Number.isFinite(station.lat) && Number.isFinite(station.lon)) unique.set(`${station.network}.${station.code}`, station);
  }
  return [...unique.values()];
}

async function fetchText(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

const [eventXml, stationText] = await Promise.all([
  fetchText('https://quakes.bgs.ac.uk/feeds/MhSeismology.xml'),
  fetchText('https://eida.bgs.ac.uk/fdsnws/station/1/query?network=GB&level=station&format=text&nodata=404'),
]);
const events = parseEvents(eventXml);
const stations = parseStations(stationText);
if (!events.length) throw new Error('The BGS feed contained no usable earthquake events.');
if (!stations.length) throw new Error('The BGS station service contained no usable stations.');

const updatedAt = new Date();
const updatedLabel = updatedAt.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({
  source: `BGS SNAPSHOT · ${updatedLabel}`,
  stationSource: `BGS EIDA SNAPSHOT · ${updatedLabel}`,
  updatedAt: updatedAt.toISOString(),
  events,
  stations,
}, null, 2)}\n`);
console.log(`Saved ${events.length} earthquakes and ${stations.length} stations to ${output}`);
