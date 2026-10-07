import {PAGES_ORIGIN, PAGES_API_METHODS, validViewerToken} from '../lib/pages-api-policy.mjs';

const encoder = new TextEncoder();
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
async function signingKey(secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('session_unavailable');
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
}
export async function issuePagesViewer(secret, now = Date.now()) {
  const subject = crypto.randomUUID();
  const issued = Math.floor(now / 1000);
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(`v1|${subject}|${issued}`));
  return `v1.${subject}.${issued}.${base64url(new Uint8Array(signature))}`;
}
export async function verifyPagesViewer(token, secret, now = Date.now()) {
  if (!validViewerToken(token)) return false;
  const [, subject, issuedText, signature] = token.split('.');
  const issued = Number(issuedText);
  const seconds = Math.floor(now / 1000);
  if (!Number.isSafeInteger(issued) || issued > seconds + 60 || seconds - issued > MAX_AGE_SECONDS + 60) return false;
  try {
    const bytes = Uint8Array.from(atob(signature.replaceAll('-', '+').replaceAll('_', '/') + '='), char => char.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', await signingKey(secret), bytes, encoder.encode(`v1|${subject}|${issued}`));
  } catch { return false; }
}
export function pagesCorsResponse(response) {
  const headers = new Headers(response.headers);
  headers.delete('Set-Cookie');
  headers.set('Access-Control-Allow-Origin', PAGES_ORIGIN);
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-LR-Viewer, Range');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Retry-After');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Vary', [headers.get('Vary'), 'Origin'].filter(Boolean).join(', '));
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}
// Only the pinned Pages frontend receives this bridge. The signed guest token
// is converted to the existing HttpOnly-cookie wire format after verification;
// all route authorization, D1 roles, upload checks and limits still run.
export async function preparePagesRequest(request, secret) {
  const origin = request.headers.get('Origin');
  const url = new URL(request.url);
  if (origin !== PAGES_ORIGIN) return {request, cors: false};
  const methods = PAGES_API_METHODS[url.pathname];
  const method = request.method === 'OPTIONS' ? request.headers.get('Access-Control-Request-Method') : request.method;
  if (!methods?.includes(method)) return {response: pagesCorsResponse(Response.json({error: 'forbidden'}, {status: 403})), cors: true};
  if (request.method === 'OPTIONS') {
    const requested = (request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
    if (requested.some(value => !['content-type', 'x-lr-viewer', 'range'].includes(value))) {
      return {response: pagesCorsResponse(Response.json({error: 'forbidden'}, {status: 403})), cors: true};
    }
    return {response: pagesCorsResponse(new Response(null, {status: 204, headers: {'Access-Control-Max-Age': '600'}})), cors: true};
  }
  if (url.pathname === '/api/session') return {request, cors: true, bootstrap: true};
  if (['GET', 'HEAD'].includes(request.method) && ['/api/activity', '/api/community-topics', '/api/ranger-info', '/api/media'].includes(url.pathname)) {
    const headers = new Headers(request.headers);
    headers.delete('Cookie');
    headers.delete('oai-authenticated-user-id');
    return {request: new Request(request, {headers}), cors: true};
  }
  const token = request.headers.get('X-LR-Viewer');
  if (!(await verifyPagesViewer(token, secret))) {
    return {response: pagesCorsResponse(Response.json({error: 'session_expired'}, {status: 401, headers: {'Cache-Control': 'no-store'}})), cors: true};
  }
  const headers = new Headers(request.headers);
  headers.delete('oai-authenticated-user-id');
  headers.delete('X-LR-Viewer');
  headers.set('Cookie', `__Host-lr_guest=${token}`);
  headers.set('Origin', url.origin);
  headers.set('Sec-Fetch-Site', 'same-origin');
  return {request: new Request(request, {headers}), cors: true};
}
