import {createHash} from 'node:crypto';
import {HttpError} from './http.mjs';
export async function database(path, {method = 'GET', body, headers = {}} = {}) {
  let url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) throw new HttpError(503, 'The shared database has not been connected yet.');
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/', '/rest/v1', '/rest/v1/'].includes(parsed.pathname)) throw Error();
    url = parsed.origin;
  } catch {
    throw new HttpError(503, 'The Supabase URL is invalid. Enter the project URL, such as https://your-project.supabase.co.');
  }
  if (!/^[\x21-\x7e]+$/.test(key)) throw new HttpError(503, 'The Supabase key contains spaces or unsupported characters. Copy the secret key again.');
  if (key.startsWith('sb_publishable_')) throw new HttpError(503, 'This is a publishable Supabase key. The server needs the secret API key.');
  let response;
  try {
    response = await fetch(`${url}/rest/v1/${path}`, {
    method, headers: { apikey: key, ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    const code = error.cause?.code || error.code;
    let message;
    if (['ENOTFOUND','EAI_AGAIN'].includes(code)) message = 'Cannot find the Supabase server. Check the project URL and internet connection.';
    else if (['CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY'].includes(code)) message = 'Node.js cannot verify the Supabase HTTPS certificate. Check the computer clock and network certificate settings.';
    else if (['EACCES','EPERM'].includes(code)) message = 'This computer blocked the connection to Supabase. Check firewall or network permissions for Node.js.';
    else if (error.name === 'TimeoutError' || ['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT'].includes(code)) message = 'The connection to Supabase timed out. Check the internet connection and project status.';
    else if (['ECONNREFUSED','ECONNRESET'].includes(code)) message = 'The connection to Supabase was refused or interrupted. Check the network and project status.';
    else message = 'Node.js could not connect to Supabase. Check the URL, internet connection and proxy settings.';
    // Only known classifications are displayed: raw errors can contain credentials.
    throw new HttpError(503, message);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (data?.message === 'School not found or archived') throw new HttpError(409, 'This school code is unavailable or archived. Ask your teacher for an active code.');
    if (data?.message === 'Code space exhausted') throw new HttpError(409, 'No unused school codes remain. Restore an archived school.');
    if (response.status === 401) throw new HttpError(503, 'Supabase rejected the API key. Use the secret key from the same project as the URL.');
    if (response.status === 403 || data?.code === '42501') throw new HttpError(503, 'Supabase denied database access. Check the server secret key and SQL permissions.');
    if (['PGRST202','PGRST205','42P01','42883'].includes(data?.code)) throw new HttpError(503, 'The TopBot database tables or functions were not found in this project. Check that the setup SQL ran in the project matching this URL.');
    if (response.status === 404) throw new HttpError(503, 'The Supabase API address was not found. Check the project URL.');
    throw new HttpError(503, 'The shared database could not complete that request. Please try again.');
  }
  return data;
}
export async function rateLimit(req, scope, limit, seconds) {
  // Vercel supplies this trusted header; local servers use the socket address.
  const address = process.env.VERCEL ? req.headers['x-vercel-forwarded-for'] : req.socket?.remoteAddress;
  const bucket = createHash('sha256').update(`${scope}:${address || 'unknown'}`).digest('hex');
  const allowed = await database('rpc/topbot_rate_limit', {method:'POST', body:{bucket_key:bucket, max_requests:limit, window_seconds:seconds}});
  if (!allowed) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
}
