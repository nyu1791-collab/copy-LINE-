/** Intentionally closed public review Worker. */
const CLOSED_HEADERS={
  "cache-control":"no-store, max-age=0",
  "content-type":"text/plain; charset=utf-8",
  "x-content-type-options":"nosniff",
  "x-frame-options":"DENY",
  "x-robots-tag":"noindex, nofollow, noarchive, nosnippet",
  "strict-transport-security":"max-age=31536000",
  "content-security-policy":"default-src 'none'",
} as const;

const worker={
  async fetch(): Promise<Response>{
    return new Response("Not Found", {status:404, headers:CLOSED_HEADERS});
  },
};

export default worker;
