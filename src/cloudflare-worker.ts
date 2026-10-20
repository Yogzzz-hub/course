import { onRequest as handleBooking } from '../functions/api/booking/[[path]].ts';
import { onRequest as handleEnquiry } from '../functions/api/enquiry.ts';
import { onRequest as handleNotify } from '../functions/api/notify.ts';

interface Env {
  ASSETS?: { fetch(request: Request): Promise<Response> };
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

    // 1. Booking API: /api/booking/*
    if (pathname.startsWith('/api/booking')) {
      return handleBooking({ request, env: env as never });
    }

    // 2. Enquiry API: /api/enquiry
    if (pathname === '/api/enquiry' || pathname.startsWith('/api/enquiry/')) {
      return handleEnquiry({ request, env: env as never });
    }

    // 3. Notification API: /api/notify
    if (pathname === '/api/notify' || pathname.startsWith('/api/notify/')) {
      return handleNotify({ request, env: env as never });
    }

    // 4. Learning Service API: /api/learning/*
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

    // 5. Fallback for Static Assets (SPA pages and files)
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
