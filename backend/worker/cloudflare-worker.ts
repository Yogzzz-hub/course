import { onRequest as handleBooking } from '../functions/api/booking/[[path]].ts';
import { onRequest as handleEnquiry } from '../functions/api/enquiry.ts';
import { onRequest as handleNotify } from '../functions/api/notify.ts';

interface Env {
  ASSETS?: { fetch(request: Request): Promise<Response> };
  BACKEND_URL?: string;
  FINANCIER_BACKEND_URL?: string;
  NEXT_PUBLIC_BACKEND_URL?: string;
  [key: string]: unknown;
}

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...headers,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Populate process.env so Node utilities like nodemailer access Cloudflare env vars
    if (typeof process !== 'undefined' && process.env) {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') {
          process.env[key] = value;
        }
      }
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    const BACKEND_URL =
      (env.BACKEND_URL as string) ||
      (env.NEXT_PUBLIC_BACKEND_URL as string) ||
      'https://course-backend-h5z1.onrender.com';

    // 0. Canonical unified /login redirect for any legacy sign-in entrypoints
    if (
      pathname === '/sign-in' ||
      pathname === '/auth/sign-in' ||
      pathname === '/auth/admin/sign-in' ||
      pathname === '/admin/login' ||
      pathname === '/student/login'
    ) {
      const loginTarget = new URL('/login', request.url);
      const rawReturn = url.searchParams.get('returnUrl') || url.searchParams.get('returnTo');
      if (rawReturn && /^\/(?!\/)/.test(rawReturn) && !rawReturn.includes('\\')) {
        loginTarget.searchParams.set('returnUrl', rawReturn);
      } else if (pathname === '/auth/admin/sign-in' || pathname === '/admin/login') {
        loginTarget.searchParams.set('returnUrl', '/admin-panel');
      }
      return Response.redirect(loginTarget, 302);
    }

    // 1. CRM Single Domain Proxy Routes (Next.js Internal Assets & Backend APIs)
    const isCrmRoute =
      pathname === '/crm' || pathname.startsWith('/crm/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/admin') ||
      pathname.startsWith('/api/student') ||
      pathname.startsWith('/api/trainer') ||
      pathname.startsWith('/api/financier') ||
      pathname.startsWith('/api/manager') ||
      pathname.startsWith('/api/notifications') ||
      pathname.startsWith('/api/enquiries') ||
      pathname.startsWith('/api/leads') ||
      pathname.startsWith('/api/admissions') ||
      pathname.startsWith('/api/courses') ||
      pathname.startsWith('/api/certificates') ||
      pathname.startsWith('/api/invoices') ||
      pathname.startsWith('/api/receipts') ||
      pathname.startsWith('/api/reports') ||
      pathname.startsWith('/api/calendar') ||
      pathname.startsWith('/api/webhooks');

    const FINANCIER_UPSTREAM = (env.FINANCIER_BACKEND_URL as string) || '';
    const UPSTREAM_URL =
      pathname.startsWith('/api/financier') && FINANCIER_UPSTREAM ? FINANCIER_UPSTREAM : BACKEND_URL;

    if (isCrmRoute && UPSTREAM_URL) {
      const targetUrl = new URL(pathname + url.search, UPSTREAM_URL);
      const newHeaders = new Headers(request.headers);
      newHeaders.set('host', targetUrl.host);
      newHeaders.set('x-forwarded-host', url.host);
      newHeaders.set('x-forwarded-proto', url.protocol.replace(':', ''));

      // Forward genuine client IP to prevent Render rate limiting all Worker users under one IP
      const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
      if (clientIp) {
        newHeaders.set('cf-connecting-ip', clientIp);
        newHeaders.set('x-forwarded-for', clientIp);
        newHeaders.set('x-real-ip', clientIp);
      }

      // Strip Sec-CH-UA client hint headers that trigger Cloudflare Bot WAF Managed Challenge on Render
      newHeaders.delete('sec-ch-ua');
      newHeaders.delete('sec-ch-ua-mobile');
      newHeaders.delete('sec-ch-ua-platform');
      newHeaders.delete('sec-ch-ua-platform-version');
      newHeaders.delete('sec-ch-ua-model');
      newHeaders.delete('sec-ch-ua-arch');
      newHeaders.delete('sec-ch-ua-bitness');
      newHeaders.delete('sec-ch-ua-full-version');
      newHeaders.delete('sec-ch-ua-full-version-list');

      // Buffer body once to allow seamless retries during Render container cold starts
      const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
      let bodyBytes: ArrayBuffer | null = null;
      if (hasBody) {
        try {
          bodyBytes = await request.arrayBuffer();
        } catch {
          bodyBytes = null;
        }
      }

      try {
        let response: Response | null = null;
        let lastError: unknown = null;
        const maxRetries = 3;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const fetchHeaders = new Headers(newHeaders);
            const res = await fetch(targetUrl.toString(), {
              method: request.method,
              headers: fetchHeaders,
              body: bodyBytes ? bodyBytes.slice(0) : undefined,
              redirect: 'manual',
            });

            const ct = res.headers.get('content-type') || '';
            const isTransientError =
              (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) &&
              (ct.includes('text/html') || res.status === 429);

            // Cold-start wakeup backoff: retry if backend is still initializing
            if (isTransientError && attempt < maxRetries - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
              continue;
            }

            response = res;
            break;
          } catch (err) {
            lastError = err;
            if (attempt < maxRetries - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
              continue;
            }
          }
        }

        if (!response) {
          throw lastError || new Error('Backend failed to respond');
        }

        // Intercept Cloudflare Bot Challenge HTML or 502/503 on JSON API routes to protect SPA callers
        const ct = response.headers.get('content-type') || '';
        const isHtmlChallenge =
          (response.status === 429 || response.status === 403 || response.status === 502 || response.status === 503) &&
          ct.includes('text/html');

        if (isHtmlChallenge && pathname.startsWith('/api/')) {
          if (pathname === '/api/admin/session') {
            return jsonResponse({ state: 'anonymous' });
          }

          if (pathname === '/api/student/session') {
            return jsonResponse({ error: 'Student service is unavailable. Please retry shortly.' }, 503);
          }

          if (pathname === '/api/auth/login') {
            return jsonResponse({
              error: 'Academy CRM server is waking up. Please retry in a few moments.'
            }, 503);
          }

          return jsonResponse({ error: 'Backend challenged or unavailable' }, 503);
        }

        const loc = response.headers.get('location');
        if (loc) {
          const respHeaders = new Headers(response.headers);
          const rewrittenLoc = loc.replace(new URL(UPSTREAM_URL).origin, url.origin);
          respHeaders.set('location', rewrittenLoc);
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: respHeaders,
          });
        }

        return response;
      } catch (err) {
        console.error('CRM Proxy fetch error:', err);
        if (pathname.startsWith('/api/')) {
          return jsonResponse({ error: 'Backend service unavailable' }, 503);
        }
      }
    }

    // 2. Booking API: /api/booking/*
    if (pathname.startsWith('/api/booking')) {
      return handleBooking({ request, env: env as never });
    }

    // 3. Enquiry API: /api/enquiry
    if (pathname === '/api/enquiry' || pathname.startsWith('/api/enquiry/')) {
      return handleEnquiry({ request, env: env as never });
    }

    // 4. Notification API: /api/notify
    if (pathname === '/api/notify' || pathname.startsWith('/api/notify/')) {
      return handleNotify({ request, env: env as never });
    }

    // 5. Learning Service API: /api/learning/*
    if (pathname.startsWith('/api/learning')) {
      // Session restoration & csrf token
      if (pathname.endsWith('/session/current') || pathname.endsWith('/session')) {
        return jsonResponse({
          csrf: `guest-${crypto.randomUUID()}`,
          analytics: false,
          guest: true,
        });
      }

      if (pathname.endsWith('/challenges')) {
        return jsonResponse({
          challenges: [],
          available: false,
          message: 'Connect your Supabase database in Cloudflare dashboard to unlock personalized challenges.',
        });
      }

      if (pathname.endsWith('/attempts')) {
        return jsonResponse({
          attempts: [],
          available: false,
        });
      }

      return jsonResponse(
        {
          message: 'The learning service requires database connection for full real-time synchronization.',
          available: false,
        },
        200
      );
    }

    // 6. Fallback for Static Assets (Prebuilt Vite SPA pages, styles, 3D Canvas, and public files)
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
