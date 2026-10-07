import {COMMUNITY_API_ORIGIN, PAGES_ORIGIN, PAGES_BASE_PATH, VIEWER_STORAGE_KEY, validViewerToken} from './pages-api-policy.mjs';

export function usesPagesApi() {
  return typeof location !== 'undefined' && location.origin === PAGES_ORIGIN;
}
export function apiUrl(path:string) {
  return usesPagesApi() && path.startsWith('/api/') ? COMMUNITY_API_ORIGIN + path : path;
}
export function boardPath() { return usesPagesApi() ? PAGES_BASE_PATH + 'boards/' : '/boards'; }
export function rankingPath() { return usesPagesApi() ? PAGES_BASE_PATH : '/'; }

let viewerToken = '';
let checkedLink = false;
let sessionPending:Promise<string>|null = null;
function storedViewer() {
  if (viewerToken) return viewerToken;
  try {
    const fromLink = checkedLink ? null : new URLSearchParams(location.search).get('viewer');
    checkedLink = true;
    const saved = localStorage.getItem(VIEWER_STORAGE_KEY);
    const value = validViewerToken(fromLink) ? fromLink : saved;
    if (validViewerToken(value)) viewerToken = value as string;
  } catch {}
  return viewerToken;
}
async function sessionToken() {
  if (storedViewer()) return viewerToken;
  if (sessionPending) return sessionPending;
  sessionPending = (async () => {
    const response = await fetch(apiUrl('/api/session'), {credentials:'omit', cache:'no-store', signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('unavailable');
    const payload = await response.json() as {viewerToken?:string};
    if (!validViewerToken(payload.viewerToken)) throw new Error('unavailable');
    viewerToken = payload.viewerToken!;
    try { localStorage.setItem(VIEWER_STORAGE_KEY, viewerToken); } catch {}
    return viewerToken;
  })().finally(() => { sessionPending = null; });
  return sessionPending;
}
export async function pagesUploadHeaders() {
  return usesPagesApi() ? {'X-LR-Viewer':await sessionToken()} : {};
}
// Each request uses the existing signed guest identity without third-party
// cookies. A rejected expired token is renewed once; an HTTP 401 means the
// operation was rejected before its handler, so it is safe to resend it.
export async function communityFetch(path:string, init:RequestInit = {}):Promise<Response> {
  if (!usesPagesApi()) return fetch(path, init);
  for (let attempt = 0; attempt < 2; attempt++) {
    const headers = new Headers(init.headers);
    headers.set('X-LR-Viewer', await sessionToken());
    const response = await fetch(apiUrl(path), {...init, headers, credentials:'omit', mode:'cors'});
    if (response.status !== 401 || attempt === 1) return response;
    await response.body?.cancel();
    viewerToken = '';
    try { localStorage.removeItem(VIEWER_STORAGE_KEY); } catch {}
  }
  throw new Error('unavailable');
}
