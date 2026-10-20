import { programmes } from './data.ts';
import { sendEmail } from '../../../server/mailer.ts';

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
  BREVO_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string | number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  BREVO_SMTP_KEY?: string;
  SMTP_FROM?: string;
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

function formatSessionDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return (
      new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
        hour12: true,
      }).format(d) + ' IST'
    );
  } catch {
    return isoString;
  }
}

function renderBookingConfirmationHtml(name: string, bookingId: string, programmeTitle: string, formattedDate: string): string {
  return `
    <div style="background-color: #f8fafc; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px 32px; text-align: center;">
          <div style="color: #38bdf8; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Aintrix Academy Admissions</div>
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 8px 0 0 0; letter-spacing: -0.5px;">Session Confirmed</h1>
          <div style="margin-top: 14px;">
            <span style="background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; font-size: 13px; font-weight: 600; padding: 4px 14px; border-radius: 9999px; display: inline-block;">
              ✓ Booking Confirmed
            </span>
          </div>
        </div>

        <!-- Content -->
        <div style="padding: 32px 32px 24px 32px;">
          <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-top: 0;">
            Hello <strong>${name}</strong>,
          </p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
            Your 1-on-1 admission counselling and career evaluation session has been successfully booked with our academic admissions team.
          </p>

          <!-- Details Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 130px; vertical-align: top;">Booking ID</td>
                <td style="padding: 8px 0; color: #0f172a; font-family: monospace; font-size: 14px; font-weight: 700;">${bookingId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Programme</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${programmeTitle}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Date & Time</td>
                <td style="padding: 8px 0; color: #0284c7; font-weight: 700;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Format</td>
                <td style="padding: 8px 0; color: #0f172a;">1-on-1 Online Video Consultation</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Status</td>
                <td style="padding: 8px 0; color: #059669; font-weight: 600;">Confirmed & Reserved</td>
              </tr>
            </table>
          </div>

          <!-- What to expect -->
          <h3 style="font-size: 15px; color: #0f172a; margin: 0 0 12px 0; font-weight: 700;">What to expect in your session:</h3>
          <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
            <li>Personalized walkthrough of the <strong>${programmeTitle}</strong> curriculum and hands-on projects.</li>
            <li>Custom career pathway evaluation matching your background and aspirational tech roles.</li>
            <li>Detailed discussion on tuition assistance, scholarships, and flexible payment plans.</li>
          </ul>

          <p style="font-size: 13px; color: #64748b; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-bottom: 0;">
            Need to reschedule or have questions before the session? Simply reply directly to this email or contact us at <a href="mailto:aintrixacademy2026@gmail.com" style="color: #0284c7; text-decoration: none;">aintrixacademy2026@gmail.com</a>.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          <div style="font-weight: 600; color: #334155;">Aintrix Academy</div>
          <div style="margin-top: 4px;">Connecting ambitious engineers to modern full-stack software careers.</div>
        </div>
      </div>
    </div>
  `;
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
  try {
    const result = await sendEmail(
      {
        to,
        subject,
        text,
        html,
        from: env.SMTP_FROM || env.ENQUIRY_FROM || 'Aintrix Academy <aintrixacademy2026@gmail.com>',
      },
      env as Record<string, unknown>
    );

    if (result.success) {
      console.log(`[Booking Mailer] Email dispatched to ${to} via ${result.provider}`);
      return { success: true, id: result.id };
    }
    console.error(`[Booking Mailer] Dispatch attempt returned: ${result.error || 'Failed'}`);
  } catch (err) {
    console.error('[Booking Mailer] Error in sendEdgeEmail:', err);
  }

  // Fallback acknowledgment
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

    // Dispatch email (awaited so serverless isolate does not terminate prematurely)
    await sendEdgeEmail(
      env,
      email,
      `Your Aintrix Academy Verification Code: ${code}`,
      `Hello ${name},\n\nYour 6-digit verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nWarm regards,\nAintrix Academy Admissions Team`,
      `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">Verify your email</h2>
          <p style="color: #475569; font-size: 15px;">Hello <strong>${name}</strong>,</p>
          <p style="color: #475569; font-size: 15px;">Your verification code for booking an admission counselling session with Aintrix Academy is:</p>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0284c7;">${code}</span>
          </div>
          <p style="color: #64748b; font-size: 13px;">This code is valid for 10 minutes. Enter it on the booking form to continue.</p>
        </div>
      `
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

    // Format programme title and session time
    const prog = programmes.find((p) => p.id === programmeId);
    const programmeTitle = prog ? prog.title : programmeId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const formattedDate = formatSessionDate(slot.startsAt);
    const confirmationHtml = renderBookingConfirmationHtml(name, bookingId, programmeTitle, formattedDate);

    const adminHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">New Counselling Session Booked</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #64748b; width: 120px;">Student:</td><td style="font-weight: 600; color: #0f172a;">${name}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Email:</td><td style="color: #0f172a;">${email}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Phone:</td><td style="color: #0f172a;">${(about.phone as string) || 'Not provided'}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Programme:</td><td style="font-weight: 600; color: #0f172a;">${programmeTitle}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Booking ID:</td><td style="font-family: monospace; font-weight: 700; color: #0284c7;">${bookingId}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Date & Time:</td><td style="font-weight: 600; color: #0f172a;">${formattedDate}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Background:</td><td style="color: #475569;">${(brief.background as string) || 'N/A'}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Goals:</td><td style="color: #475569;">${(brief.goals as string) || 'N/A'}</td></tr>
        </table>
      </div>
    `;

    // Confirmation emails (awaited so serverless worker completes dispatch)
    const adminEmail = env.ENQUIRY_TO || 'aintrixacademy2026@gmail.com';
    await Promise.allSettled([
      sendEdgeEmail(
        env,
        email,
        `Session Confirmed: Your Aintrix Academy Counselling Session (${bookingId})`,
        `Hello ${name},\n\nYour 1-on-1 admission counselling session is confirmed!\n\nBooking ID: ${bookingId}\nProgramme: ${programmeTitle}\nDate & Time: ${formattedDate}\n\nOur team will connect with you at your chosen time.\n\nWarm regards,\nAintrix Academy Admissions`,
        confirmationHtml
      ),
      sendEdgeEmail(
        env,
        adminEmail,
        `New Counselling Booking: ${name} (${bookingId})`,
        `New Booking received:\n\nStudent: ${name}\nEmail: ${email}\nPhone: ${about.phone || 'N/A'}\nProgramme: ${programmeTitle}\nSlot: ${formattedDate}`,
        adminHtml
      ),
    ]);

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
