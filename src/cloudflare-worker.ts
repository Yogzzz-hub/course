export interface Env {
  ASSETS?: { fetch(request: Request): Promise<Response> };
  BACKEND_URL?: string;
  NEXT_PUBLIC_BACKEND_URL?: string;
  ALLOWED_ORIGIN?: string;
  [key: string]: unknown;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Root / health endpoint
    if (pathname === '/api/health' || pathname === '/healthz') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 2. Resolve Backend Target (Render Service URL)
    const backendTarget = (env.BACKEND_URL || env.NEXT_PUBLIC_BACKEND_URL || '').toString().replace(/\/$/, '');

    // 3. If Backend Target is configured, proxy API requests and Dynamic App routes
    if (backendTarget) {
      const isApiOrAppRoute =
        pathname.startsWith('/api') ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/student') ||
        pathname.startsWith('/trainer') ||
        pathname.startsWith('/manager') ||
        pathname.startsWith('/financier') ||
        pathname.startsWith('/courses') ||
        pathname.startsWith('/book-session') ||
        pathname.startsWith('/contact') ||
        pathname.startsWith('/about');

      if (isApiOrAppRoute) {
        const targetUrl = new URL(pathname + url.search, backendTarget);
        const headers = new Headers(request.headers);
        headers.set('X-Forwarded-Host', url.host);
        headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

        return fetch(targetUrl.toString(), {
          method: request.method,
          headers,
          body: request.body,
          redirect: 'follow',
        });
      }
    }

    // 4. Fallback to Cloudflare Static Assets if available
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    // 5. If static asset was 404 and backend is set, pass to backend
    if (backendTarget) {
      const targetUrl = new URL(pathname + url.search, backendTarget);
      return fetch(new Request(targetUrl.toString(), request));
    }

    return new Response('Apex Global Academy Edge Router Active', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};

export default worker;
