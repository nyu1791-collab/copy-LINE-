export const PAGES_ORIGIN = 'https://line-rangers-fan.github.io';
export const PAGES_BASE_PATH = '/line-rangers-pvp/';
export const COMMUNITY_API_ORIGIN = 'https://line-rangers-pvp-community-production.n-yu1791.workers.dev';
export const VIEWER_STORAGE_KEY = 'line-rangers-community-viewer-v1';
export const VIEWER_PATTERN = /^v1\.[a-f0-9-]{36}\.[0-9]{10,}\.[A-Za-z0-9_-]{43}$/;
export const PAGES_API_METHODS = Object.freeze({
  '/api/session': ['GET'],
  '/api/activity': ['GET'],
  '/api/community-topics': ['GET'],
  '/api/ranger-info': ['GET'],
  '/api/board': ['GET', 'POST'],
  '/api/media': ['GET', 'HEAD'],
  '/api/upload': ['PUT'],
  '/api/upload/session': ['POST'],
  '/api/upload/part': ['PUT'],
  '/api/upload/complete': ['POST'],
  '/api/translate': ['POST'],
  '/api/telemetry': ['POST'],
});
export function validViewerToken(value) {
  return typeof value === 'string' && value.length <= 256 && VIEWER_PATTERN.test(value);
}
