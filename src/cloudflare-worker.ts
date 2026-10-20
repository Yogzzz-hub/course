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

    // 2. Static public assets (favicons, images, specific static files in public)
    const isStaticFile = pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$/i);
    if (isStaticFile && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    // 3. Resolve Backend URL (Render Web Service)
    const backendTarget = (env.BACKEND_URL || env.NEXT_PUBLIC_BACKEND_URL || 'https://course-backend.onrender.com')
      .toString()
      .trim()
      .replace(/\/$/, '');

    // 4. Proxy to Render Backend
    try {
      const targetUrl = new URL(pathname + url.search, backendTarget);

      const forwardHeaders = new Headers(request.headers);
      forwardHeaders.set('X-Forwarded-Host', url.host);
      forwardHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
      const clientIp = request.headers.get('CF-Connecting-IP');
      if (clientIp) {
        forwardHeaders.set('X-Real-IP', clientIp);
      }

      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: forwardHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'manual',
      });

      // Adjust redirect Location header if it points to backend internal URL
      const responseHeaders = new Headers(response.headers);
      const location = responseHeaders.get('Location');
      if (location && location.includes(backendTarget)) {
        responseHeaders.set('Location', location.replace(backendTarget, url.origin));
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch {
      // 5. Fallback screen if backend is cold-starting or temporarily warming up
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Apex Global Academy</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,-apple-system,sans-serif;background:#090d16;color:#f0f6fc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center}.card{max-width:440px;background:#111827;border:1px solid #1f2937;padding:36px;border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,0.6)}h1{color:#60a5fa;font-size:22px;margin:0 0 12px;font-weight:700}p{color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 20px}.spinner{border:3px solid #1f2937;border-top:3px solid #3b82f6;border-radius:50%;width:28px;height:28px;animation:spin 1s linear infinite;margin:16px auto}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}.sub{font-size:12px;color:#6b7280;margin-top:16px}</style></head><body><div class="card"><h1>Apex Global Academy</h1><p>Starting up secure application gateway. Connecting to services...</p><div class="spinner"></div><p class="sub">This page will reload automatically in a few seconds.</p><script>setTimeout(()=>location.reload(), 3000);</script></div></body></html>`,
        {
          status: 502,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Retry-After': '3',
          },
        }
      );
    }
  },
};

export default worker;
