/** Cloudflare Worker entry point for the vinext-starter template. */
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // This review deployment intentionally does not bind Cloudflare Images.
    // Character/media assets are served directly, avoiding a paid image-
    // transformation dependency while the site is still under development.
    if (new URL(request.url).pathname === "/_vinext/image") {
      return secureResponse(new Response("image_optimization_disabled", { status: 404 }));
    }
    return secureResponse(await handler.fetch(request, env, ctx));
  },
};

// Keep browser-wide protections in the Worker boundary so static assets and
// route handlers receive the same safe defaults without coupling UI code to
// a framework-specific middleware. These headers do not alter API bodies,
// media range responses, or the site's public no-login access model.
function secureResponse(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default worker;
