import {createHash, createHmac, timingSafeEqual, randomBytes} from 'node:crypto';
import {HttpError} from './http.mjs';
const hash = value => createHash('sha256').update(value).digest();
export const equals = (a, b) => timingSafeEqual(hash(a), hash(b));
function key() {
  const secret = process.env.TOPBOT_SESSION_SECRET;
  if (!secret || secret.length < 32 || !process.env.TOPBOT_ADMIN_CODE) throw new HttpError(503, 'Admin access is not configured on this server.');
  // Changing either server secret invalidates all existing sessions.
  return createHmac('sha256', secret).update(process.env.TOPBOT_ADMIN_CODE).digest();
}
const sign = payload => createHmac('sha256', key()).update(payload).digest('base64url');
export function issueSession() {
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ expiresAt, nonce: randomBytes(24).toString('hex') })).toString('base64url');
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}
export function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (token.length > 1024) throw new HttpError(401, 'Please enter your admin code again.');
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !equals(sign(payload), signature)) throw new HttpError(401, 'Please enter your admin code again.');
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now()) throw Error();
  } catch { throw new HttpError(401, 'Please enter your admin code again.'); }
}
