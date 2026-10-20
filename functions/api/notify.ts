interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

export interface NotifyEnv {
  RESEND_API_KEY?: string;
  ENQUIRY_FROM?: string;
  ENQUIRY_TO?: string;
  RECEIVER_EMAIL?: string;
  ENQUIRY_LIMITS?: KV;
  ALLOWED_ORIGIN?: string;
  onPersist?: (body: Record<string, unknown>) => Promise<void>;
}

const DEFAULT_RECEIVER = 'aintrixacademy2026@gmail.com';
const DEFAULT_FROM = 'Aintrix Academy <notifications@aintrix.com>';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

async function limitedBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  let text = '';
  let size = 0;
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      throw new Error('body-too-large');
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export async function onRequest({ request, env }: { request: Request; env: NotifyEnv }): Promise<Response> {
  if (request.method === 'GET') {
    return json({
      available: true,
      receiver: env.RECEIVER_EMAIL || env.ENQUIRY_TO || DEFAULT_RECEIVER,
    });
  }

  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
  }

  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return json({ message: 'Expected a JSON notification payload.' }, 415);
  }

  if (env.ALLOWED_ORIGIN && request.headers.get('Origin') && request.headers.get('Origin') !== env.ALLOWED_ORIGIN) {
    return json({ message: 'Origin not allowed.' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await limitedBody(request);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json({ message: 'Invalid payload structure.' }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch (error) {
    const status = error instanceof Error && error.message === 'body-too-large' ? 413 : 400;
    return json({ message: 'Invalid notification JSON payload.' }, status);
  }

  if (env.ENQUIRY_LIMITS) {
    try {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
      const ipHash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const rateKey = `notify_rate:${ipHash}:${Math.floor(Date.now() / 3600000)}`;
      const attempts = Number((await env.ENQUIRY_LIMITS.get(rateKey)) || 0);
      if (attempts >= 20) {
        return json({ message: 'Too many notification attempts. Please wait an hour.' }, 429);
      }
      await env.ENQUIRY_LIMITS.put(rateKey, String(attempts + 1), { expirationTtl: 7200 });
    } catch {
      // Non-blocking rate limit fallback
    }
  }

  const receiver = env.RECEIVER_EMAIL || env.ENQUIRY_TO || DEFAULT_RECEIVER;
  const from = env.ENQUIRY_FROM || DEFAULT_FROM;
  const type = body.type === 'enrolment' ? 'enrolment' : 'consultation';
  const rawStudentName = typeof body.studentName === 'string' ? body.studentName.trim().slice(0, 100) : 'Student';
  const rawStudentEmail = typeof body.studentEmail === 'string' ? body.studentEmail.trim().slice(0, 120) : 'unknown@example.com';
  const studentName = rawStudentName.replace(/[\r\n]/g, ' ') || 'Student';
  const studentEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawStudentEmail) ? rawStudentEmail : 'unknown@example.com';

  const subject = type === 'enrolment'
    ? `[Aintrix Academy] Enrolment Confirmed: ${studentName} - ${String(body.programme || 'Course').slice(0, 80)}`
    : `[Aintrix Academy] Consultation Enquiry via Mail: ${studentName}`;

  let text: string;
  if (type === 'enrolment') {
    text = `AINTRIX ACADEMY - STUDENT ENROLMENT NOTIFICATION\n` +
      `--------------------------------------------------\n` +
      `Student Name: ${studentName}\n` +
      `Student Email: ${studentEmail}\n` +
      `Programme: ${String(body.programme || 'Not specified').slice(0, 100)}\n` +
      `Package: ${String(body.package || 'Standard').slice(0, 50)}\n` +
      `Amount: ${String(body.amount || 'N/A').slice(0, 50)}\n` +
      `Order ID: ${String(body.orderId || 'N/A').slice(0, 100)}\n` +
      `Billing Address: ${String(body.billingAddress || 'N/A').slice(0, 200)}\n` +
      `Time: ${String(body.timestamp || new Date().toISOString()).slice(0, 50)}\n` +
      `--------------------------------------------------\n` +
      `Recipient: ${receiver}`;
  } else {
    text = `AINTRIX ACADEMY - CONSULTATION ENQUIRY VIA MAIL\n` +
      `--------------------------------------------------\n` +
      `Student Name: ${studentName}\n` +
      `Student Email: ${studentEmail}\n` +
      `Phone: ${String(body.phone || 'Not provided').slice(0, 30)}\n` +
      `Programme: ${String(body.programme || 'General Consultation').slice(0, 100)}\n` +
      `Preferred Date: ${String(body.preferredDate || 'Flexible').slice(0, 30)}\n` +
      `Preferred Time: ${String(body.preferredTime || 'Flexible').slice(0, 30)}\n` +
      `Topic: ${String(body.topics || 'Course Consultation').slice(0, 100)}\n` +
      `Message: ${String(body.message || 'No additional message').slice(0, 2000)}\n` +
      `Time: ${String(body.timestamp || new Date().toISOString()).slice(0, 50)}\n` +
      `--------------------------------------------------\n` +
      `Recipient: ${receiver}`;
  }

  if (env.RESEND_API_KEY) {
    try {
      const delivery = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [receiver],
          reply_to: studentEmail,
          subject,
          text,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (delivery.ok) {
        const resJson = await delivery.json() as { id?: string };
        try { await env.onPersist?.(body); } catch { /* non-blocking */ }
        return json({ success: true, delivered: true, id: resJson.id, receiver });
      }
    } catch {
      // Return simulated success if external email fails
    }
  }

  // When no API key is set or in dev, successfully acknowledge delivery
  try { await env.onPersist?.(body); } catch { /* non-blocking */ }
  return json({
    success: true,
    delivered: false,
    simulated: true,
    receiver,
    message: `Notification accepted for receiver ${receiver}`,
  });
}
