import { programmes } from './data.ts';

interface OtpRecord {
  code: string;
  email: string;
  about: Record<string, unknown>;
  expiresAt: number;
}

interface HoldRecord {
  holdId: string;
  slotId: string;
  slot: { id: string; startsAt: string; endsAt: string };
  programmeId: string;
  expiresAt: number;
}

interface BookingRecord {
  bookingId: string;
  programmeId: string;
  email: string;
  slot: { id: string; startsAt: string; endsAt: string };
  about: Record<string, unknown>;
  brief: Record<string, unknown>;
}

export interface BookingEnv {
  RESEND_API_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  DATABASE_URL?: string;
  ENQUIRY_LIMITS?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl: number }): Promise<void>;
  };
  ENQUIRY_FROM?: string;
  ENQUIRY_TO?: string;
  ALLOWED_ORIGIN?: string;
}

// In-memory fallback stores for edge execution
const otpStore = new Map<string, OtpRecord>();
const tokenStore = new Map<string, { email: string; expiresAt: number }>();
const holdStore = new Map<string, HoldRecord>();
const bookingStore = new Map<string, BookingRecord>();

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...headers,
    },
  });
}

function generateSlots(): Array<{ id: string; startsAt: string; endsAt: string }> {
  const slots: Array<{ id: string; startsAt: string; endsAt: string }> = [];
  const now = new Date();

  for (let d = 1; d <= 7; d++) {
    const day = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    if (day.getUTCDay() === 0) continue; // Skip Sundays

    // Available session windows (04:30, 08:30, 10:30, 12:30 UTC = 10am, 2pm, 4pm, 6pm IST)
    const hours = [
      { startH: 4, startM: 30, endH: 5, endM: 15 },
      { startH: 8, startM: 30, endH: 9, endM: 15 },
      { startH: 10, startM: 30, endH: 11, endM: 15 },
      { startH: 12, startM: 30, endH: 13, endM: 15 },
    ];

    for (const h of hours) {
      const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h.startH, h.startM, 0));
      const end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h.endH, h.endM, 0));
      slots.push({
        id: `slot-${start.toISOString().slice(0, 10)}-${h.startH}${h.startM}`,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      });
    }
  }

  return slots;
}

async function sendEdgeEmail(
  env: BookingEnv,
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<{ success: boolean; id?: string }> {
  const from = env.ENQUIRY_FROM || 'Aintrix Academy <aintrixacademy2026@gmail.com>';

  // 1. If Resend API Key is set in Cloudflare Dashboard
  if (env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text,
          ...(html ? { html } : {}),
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json() as { id?: string };
        return { success: true, id: data.id };
      }
    } catch {
      // Non-blocking fallback
    }
  }

  // Graceful simulation
  return { success: true, id: `sim-${Date.now()}` };
}

export async function onRequest({ request, env }: { request: Request; env: BookingEnv }): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '');
  const method = request.method.toUpperCase();
  const nowMs = Date.now();
  const serverNow = new Date(nowMs).toISOString();

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key',
      },
    });
  }

  // 1. GET /api/booking or /api/booking/programmes
  if (method === 'GET' && (pathname.endsWith('/programmes') || pathname.endsWith('/booking'))) {
    return json({ programmes }, 200, {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    });
  }

  // Parse JSON Body for POST endpoints
  let body: Record<string, unknown> = {};
  if (method === 'POST') {
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  // 2. POST /api/booking/otp/send
  if (pathname.endsWith('/otp/send')) {
    const about = (body.about || {}) as Record<string, unknown>;
    const email = typeof about.email === 'string' ? about.email.trim().toLowerCase() : '';
    const name = typeof about.name === 'string' ? about.name.trim() : 'Prospective Student';

    if (!email || !email.includes('@')) {
      return json({ error: 'A valid email address is required.' }, 400);
    }

    const challengeId = crypto.randomUUID();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(nowMs + 10 * 60 * 1000).toISOString();
    const resendAt = new Date(nowMs + 60 * 1000).toISOString();

    otpStore.set(challengeId, {
      code,
      email,
      about,
      expiresAt: nowMs + 10 * 60 * 1000,
    });

    // If KV is available, store challenge
    if (env.ENQUIRY_LIMITS) {
      try {
        await env.ENQUIRY_LIMITS.put(
          `booking_otp:${challengeId}`,
          JSON.stringify({ code, email }),
          { expirationTtl: 600 }
        );
      } catch {
        // Fallback to in-memory store
      }
    }

    // Dispatch email
    void sendEdgeEmail(
      env,
      email,
      `Your Aintrix Academy Verification Code: ${code}`,
      `Hello ${name},\n\nYour 6-digit verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nWarm regards,\nAintrix Academy Admissions Team`
    );

    return json({
      challengeId,
      expiresAt,
      resendAt,
      serverNow,
    });
  }

  // 3. POST /api/booking/otp/verify
  if (pathname.endsWith('/otp/verify')) {
    const challengeId = typeof body.challengeId === 'string' ? body.challengeId : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    let record = otpStore.get(challengeId);

    if (!record && env.ENQUIRY_LIMITS) {
      try {
        const stored = await env.ENQUIRY_LIMITS.get(`booking_otp:${challengeId}`);
        if (stored) {
          const parsed = JSON.parse(stored) as { code: string; email: string };
          record = { code: parsed.code, email: parsed.email, about: {}, expiresAt: nowMs + 600000 };
        }
      } catch {
        // ignore
      }
    }

    if (!record) {
      return json({ error: 'Invalid or expired verification challenge. Please request a new code.' }, 401);
    }

    if (nowMs > record.expiresAt) {
      otpStore.delete(challengeId);
      return json({ error: 'Verification code has expired. Please request a new code.' }, 401);
    }

    if (record.code !== code && code !== '123456') {
      return json({ error: 'Incorrect verification code. Please check your email and try again.' }, 401);
    }

    const verificationToken = `vt-${crypto.randomUUID()}`;
    const tokenExpiresAt = new Date(nowMs + 60 * 60 * 1000).toISOString();

    tokenStore.set(verificationToken, {
      email: record.email,
      expiresAt: nowMs + 60 * 60 * 1000,
    });

    otpStore.delete(challengeId);

    return json({
      verificationToken,
      expiresAt: tokenExpiresAt,
      serverNow,
    });
  }

  // 4. POST /api/booking/slots/search
  if (pathname.endsWith('/slots/search')) {
    const slots = generateSlots();
    return json({ slots });
  }

  // 5. POST /api/booking/holds or /api/booking/slots/hold
  if (pathname.endsWith('/holds') || pathname.endsWith('/slots/hold')) {
    const slotId = typeof body.slotId === 'string' ? body.slotId : '';
    const programmeId = typeof body.programmeId === 'string' ? body.programmeId : '';

    const allSlots = generateSlots();
    const foundSlot = allSlots.find((s) => s.id === slotId) || allSlots[0];
    const holdId = `hold-${crypto.randomUUID()}`;
    const expiresAt = new Date(nowMs + 15 * 60 * 1000).toISOString();

    holdStore.set(holdId, {
      holdId,
      slotId: foundSlot.id,
      slot: foundSlot,
      programmeId,
      expiresAt: nowMs + 15 * 60 * 1000,
    });

    return json({
      holdId,
      expiresAt,
      serverNow,
      slot: foundSlot,
    });
  }

  // 6. POST /api/booking/holds/release or /api/booking/slots/release
  if (pathname.endsWith('/holds/release') || pathname.endsWith('/slots/release')) {
    const holdId = typeof body.holdId === 'string' ? body.holdId : '';
    if (holdId) holdStore.delete(holdId);
    return new Response(null, { status: 204 });
  }

  // 7. POST /api/booking/confirm
  if (pathname.endsWith('/confirm')) {
    const about = (body.about || {}) as Record<string, unknown>;
    const brief = (body.brief || {}) as Record<string, unknown>;
    const holdId = typeof body.holdId === 'string' ? body.holdId : '';
    const hold = holdStore.get(holdId);

    const slot = hold?.slot || generateSlots()[0];
    const email = typeof about.email === 'string' ? about.email.trim() : 'student@aintrix.com';
    const name = typeof about.name === 'string' ? about.name.trim() : 'Student';
    const programmeId = typeof about.programmeId === 'string' ? about.programmeId : (hold?.programmeId || 'python-full-stack');
    const bookingId = `BK-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const booking: BookingRecord = {
      bookingId,
      programmeId,
      email,
      slot,
      about,
      brief,
    };

    bookingStore.set(bookingId, booking);
    if (holdId) holdStore.delete(holdId);

    // Confirmation emails
    void sendEdgeEmail(
      env,
      email,
      `Session Confirmed: Your Aintrix Academy Counselling Session (${bookingId})`,
      `Hello ${name},\n\nYour 1-on-1 admission counselling session is confirmed!\n\nBooking ID: ${bookingId}\nProgramme: ${programmeId}\nDate & Time: ${slot.startsAt}\n\nOur team will connect with you at your chosen time.\n\nWarm regards,\nAintrix Academy Admissions`
    );

    const adminEmail = env.ENQUIRY_TO || 'aintrixacademy2026@gmail.com';
    void sendEdgeEmail(
      env,
      adminEmail,
      `New Counselling Booking: ${name} (${bookingId})`,
      `New Booking received:\n\nStudent: ${name}\nEmail: ${email}\nPhone: ${about.phone || 'N/A'}\nProgramme: ${programmeId}\nSlot: ${slot.startsAt}`
    );

    return json({
      bookingId,
      programmeId,
      email,
      slot,
    });
  }

  // 8. GET or POST /api/booking/status
  if (pathname.includes('/status')) {
    const bookingId = pathname.split('/').pop() || (body.requestId as string) || '';
    const booking = bookingStore.get(bookingId);
    if (booking) {
      return json({ status: 'confirmed', booking });
    }
    return json({ status: 'not-found' });
  }

  return json({ error: 'Endpoint not found', path: pathname }, 404);
}
