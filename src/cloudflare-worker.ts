import { onRequest as handleBooking } from '../functions/api/booking/[[path]].ts';
import { onRequest as handleEnquiry } from '../functions/api/enquiry.ts';
import { onRequest as handleNotify } from '../functions/api/notify.ts';

interface Env {
  ASSETS?: { fetch(request: Request): Promise<Response> };
  BACKEND_URL?: string;
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

    // 1. CRM Single Domain Proxy Routes (Login, Portals, Auth & Internal Assets)
    const isCrmRoute =
      pathname === '/login' || pathname.startsWith('/login/') ||
      pathname === '/student' || pathname.startsWith('/student/') ||
      pathname === '/trainer' || pathname.startsWith('/trainer/') ||
      pathname === '/admin' || pathname.startsWith('/admin/') ||
      pathname === '/financier' || pathname.startsWith('/financier/') ||
      pathname === '/manager' || pathname.startsWith('/manager/') ||
      pathname === '/verify-certificate' || pathname.startsWith('/verify-certificate/') ||
      pathname === '/crm' || pathname.startsWith('/crm/') ||
      pathname === '/portal' || pathname.startsWith('/portal/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/admin') ||
      pathname.startsWith('/api/student') ||
      pathname.startsWith('/api/trainer') ||
      pathname.startsWith('/api/financier') ||
      pathname.startsWith('/api/manager');

    if (isCrmRoute && BACKEND_URL) {
      const targetUrl = new URL(pathname + url.search, BACKEND_URL);
      const newHeaders = new Headers(request.headers);
      newHeaders.set('host', targetUrl.host);
      newHeaders.set('x-forwarded-host', url.host);
      newHeaders.set('x-forwarded-proto', url.protocol.replace(':', ''));

      try {
        const response = await fetch(targetUrl.toString(), {
          method: request.method,
          headers: newHeaders,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
          redirect: 'manual',
        });

        const loc = response.headers.get('location');
        if (loc) {
          const respHeaders = new Headers(response.headers);
          const rewrittenLoc = loc.replace(new URL(BACKEND_URL).origin, url.origin);
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
