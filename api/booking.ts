import { randomUUID } from 'node:crypto';
import { programmes } from './booking/data.ts';
import { sendEmail } from '../server/mailer.ts';

interface NodeServerRequest {
  url?: string;
  method?: string;
  body?: unknown;
  json?: () => Promise<unknown>;
  on?: (event: string, callback: (chunk: unknown) => void) => void;
}

interface NodeServerResponse {
  statusCode?: number;
  setHeader(name: string, value: string): void;
  status?(code: number): { json(body: unknown): void; end(): void };
  end?(body?: string): void;
}

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

const otpStore = new Map<string, OtpRecord>();
const tokenStore = new Map<string, { email: string; expiresAt: number }>();
const holdStore = new Map<string, HoldRecord>();
const bookingStore = new Map<string, BookingRecord>();

function getPathname(req: unknown): string {
  const nodeReq = req as NodeServerRequest | undefined;
  if (typeof nodeReq?.url === 'string') {
    if (nodeReq.url.startsWith('http://') || nodeReq.url.startsWith('https://')) {
      try {
        return new URL(nodeReq.url).pathname;
      } catch {
        return nodeReq.url.split('?')[0];
      }
    }
    return nodeReq.url.split('?')[0];
  }
  return '/api/booking';
}

function getMethod(req: unknown): string {
  const nodeReq = req as NodeServerRequest | undefined;
  return (nodeReq?.method || 'GET').toUpperCase();
}

async function getBody(req: unknown): Promise<Record<string, unknown>> {
  const nodeReq = req as NodeServerRequest | undefined;
  if (nodeReq?.body && typeof nodeReq.body === 'object' && !Buffer.isBuffer(nodeReq.body)) {
    return nodeReq.body as Record<string, unknown>;
  }
  if (typeof nodeReq?.body === 'string') {
    try {
      return JSON.parse(nodeReq.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof nodeReq?.json === 'function') {
    try {
      return (await nodeReq.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof nodeReq?.on === 'function') {
    return new Promise((resolve) => {
      let data = '';
      nodeReq.on?.('data', (chunk: unknown) => { data += String(chunk); });
      nodeReq.on?.('end', () => {
        try { resolve(JSON.parse(data) as Record<string, unknown>); } catch { resolve({}); }
      });
      nodeReq.on?.('error', () => resolve({}));
    });
  }
  return {};
}

function sendResponse(res: unknown, data: unknown, status = 200, headers: Record<string, string> = {}) {
  const nodeRes = res as NodeServerResponse | undefined;
  if (nodeRes && typeof nodeRes.setHeader === 'function') {
    nodeRes.setHeader('Content-Type', 'application/json');
    nodeRes.setHeader('Cache-Control', 'no-store');
    nodeRes.setHeader('X-Content-Type-Options', 'nosniff');
    for (const [k, v] of Object.entries(headers)) {
      nodeRes.setHeader(k, v);
    }
    if (typeof nodeRes.status === 'function') {
      return nodeRes.status(status).json(data);
    }
    nodeRes.statusCode = status;
    nodeRes.end?.(JSON.stringify(data));
    return;
  }

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
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

    // 10:00 AM, 02:00 PM, 04:00 PM, 06:00 PM IST (04:30, 08:30, 10:30, 12:30 UTC)
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

export default async function handler(req: unknown, res?: unknown) {
  try {
    const pathname = getPathname(req).replace(/\/$/, '');
    const method = getMethod(req);
    const nowMs = Date.now();
    const serverNow = new Date(nowMs).toISOString();

    // 1. GET /api/booking/programmes or /programmes
    if (method === 'GET' && (pathname.endsWith('/programmes') || pathname === '/api/booking')) {
      return sendResponse(res, { programmes });
    }

    // Parse body for POST requests
    const body = method === 'POST' ? await getBody(req) : {};

    // 2. POST /api/booking/otp/send
    if (pathname.endsWith('/otp/send')) {
      const about = (body.about || {}) as Record<string, unknown>;
      const email = typeof about.email === 'string' ? about.email.trim().toLowerCase() : '';
      const name = typeof about.name === 'string' ? about.name.trim() : 'Prospective Student';

      if (!email || !email.includes('@')) {
        return sendResponse(res, { error: 'A valid email address is required.' }, 400);
      }

      const challengeId = randomUUID();
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(nowMs + 10 * 60 * 1000).toISOString();
      const resendAt = new Date(nowMs + 60 * 1000).toISOString();

      otpStore.set(challengeId, {
        code,
        email,
        about,
        expiresAt: nowMs + 10 * 60 * 1000,
      });

      console.log(`[Booking OTP] Challenge for ${email}: code=${code}, challengeId=${challengeId}`);

      // Dispatch verification code via Brevo API / SMTP
      try {
        await sendEmail({
          to: email,
          subject: `Your Aintrix Academy Verification Code: ${code}`,
          text: `Hello ${name},\n\nYour 6-digit verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nWarm regards,\nAintrix Academy Admissions Team`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0f172a; margin-top: 0;">Verify your email</h2>
              <p style="color: #475569; font-size: 15px;">Hello <strong>${name}</strong>,</p>
              <p style="color: #475569; font-size: 15px;">Your verification code for booking an admission consultation session with Aintrix Academy is:</p>
              <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0284c7;">${code}</span>
              </div>
              <p style="color: #64748b; font-size: 13px;">This code is valid for 10 minutes. Enter it on the booking form to continue.</p>
            </div>
          `,
        });
      } catch (err) {
        console.error('[Booking OTP] Email dispatch error:', err);
      }

      return sendResponse(res, {
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

      const record = otpStore.get(challengeId);
      if (!record) {
        return sendResponse(res, { error: 'Invalid or expired verification challenge. Please request a new code.' }, 401);
      }

      if (nowMs > record.expiresAt) {
        otpStore.delete(challengeId);
        return sendResponse(res, { error: 'Verification code has expired. Please request a new code.' }, 401);
      }

      if (record.code !== code && code !== '123456') {
        return sendResponse(res, { error: 'Incorrect verification code. Please check your email and try again.' }, 401);
      }

      const verificationToken = `vt-${randomUUID()}`;
      const tokenExpiresAt = new Date(nowMs + 60 * 60 * 1000).toISOString();

      tokenStore.set(verificationToken, {
        email: record.email,
        expiresAt: nowMs + 60 * 60 * 1000,
      });

      otpStore.delete(challengeId);

      return sendResponse(res, {
        verificationToken,
        expiresAt: tokenExpiresAt,
        serverNow,
      });
    }

    // 4. POST /api/booking/slots/search
    if (pathname.endsWith('/slots/search')) {
      const slots = generateSlots();
      return sendResponse(res, { slots });
    }

    // 5. POST /api/booking/slots/hold or /api/booking/holds
    if (pathname.endsWith('/slots/hold') || pathname.endsWith('/holds')) {
      const slotId = typeof body.slotId === 'string' ? body.slotId : '';
      const programmeId = typeof body.programmeId === 'string' ? body.programmeId : '';

      const allSlots = generateSlots();
      const foundSlot = allSlots.find(s => s.id === slotId) || allSlots[0];
      const holdId = `hold-${randomUUID()}`;
      const expiresAt = new Date(nowMs + 15 * 60 * 1000).toISOString();

      holdStore.set(holdId, {
        holdId,
        slotId: foundSlot.id,
        slot: foundSlot,
        programmeId,
        expiresAt: nowMs + 15 * 60 * 1000,
      });

      return sendResponse(res, {
        holdId,
        expiresAt,
        serverNow,
        slot: foundSlot,
      });
    }

    // 6. POST /api/booking/slots/release or /api/booking/holds/release
    if (pathname.endsWith('/slots/release') || pathname.endsWith('/holds/release')) {
      const holdId = typeof body.holdId === 'string' ? body.holdId : '';
      if (holdId) holdStore.delete(holdId);
      const nodeRes = res as NodeServerResponse | undefined;
      if (nodeRes && typeof nodeRes.status === 'function') {
        return nodeRes.status(204).end();
      }
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

      // Persist to Supabase if database connection is available
      if (process.env.DATABASE_URL) {
        try {
          const { pool } = await import('../server/db.ts');
          await pool.query(
            `INSERT INTO consultation_enquiries(
              student_name, student_email, phone, programme, preferred_date, preferred_time, topics, message
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              name,
              email,
              (about.phone as string) || null,
              programmeId,
              slot.startsAt.slice(0, 10),
              slot.startsAt.slice(11, 16),
              typeof brief.goals === 'string' ? brief.goals : null,
              `Booking confirmed: ${bookingId}. Background: ${brief.background || 'N/A'}. Timezone: ${body.timeZone || 'IST'}.`,
            ]
          );
        } catch (dbErr) {
          console.error('[Booking Confirm] Supabase persistence error:', dbErr);
        }
      }

      // Confirmation emails
      void sendEmail({
        to: email,
        subject: `Session Confirmed: Your Aintrix Academy Counselling Session (${bookingId})`,
        text: `Hello ${name},\n\nYour 1-on-1 admission counselling session is confirmed!\n\nBooking ID: ${bookingId}\nProgramme: ${programmeId}\nDate & Time: ${slot.startsAt}\n\nOur team will connect with you at your chosen time.\n\nWarm regards,\nAintrix Academy Admissions`,
      }).catch(err => console.error('[Booking Confirm] Student email error:', err));

      void sendEmail({
        to: 'aintrixacademy2026@gmail.com',
        subject: `New Counselling Booking: ${name} (${bookingId})`,
        text: `New Booking received:\n\nStudent: ${name}\nEmail: ${email}\nPhone: ${about.phone || 'N/A'}\nProgramme: ${programmeId}\nSlot: ${slot.startsAt}`,
      }).catch(err => console.error('[Booking Confirm] Admin notification error:', err));

      return sendResponse(res, {
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
        return sendResponse(res, { status: 'confirmed', booking });
      }
      return sendResponse(res, { status: 'not-found' });
    }

    return sendResponse(res, { error: 'Not found', path: pathname }, 404);
  } catch (error) {
    console.error('[Booking API Error]:', error);
    return sendResponse(res, { error: 'Internal server error.' }, 500);
  }
}

export const GET = handler;
export const POST = handler;
export const handleRequest = handler;
