export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
export async function readBody(req, limit = 512 * 1024) {
  let body = req.body;
  if (body === undefined) {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk);
      if (size > limit) throw new HttpError(413, 'This request is too large.');
      chunks.push(Buffer.from(chunk));
    }
    body = Buffer.concat(chunks).toString('utf8');
  }
  try {
    if (Buffer.isBuffer(body)) body = body.toString('utf8');
    if (Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body)) > limit) throw new HttpError(413, 'This request is too large.');
    if (typeof body === 'string') body = JSON.parse(body);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error();
    return body;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Invalid request.');
  }
}
export function fail(res, error) {
  json(res, error.status || 503, { ok: false, error: error.status ? error.message : 'The shared database is unavailable. Please try again.' });
}
