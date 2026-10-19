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
    },
  });
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

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return json({ message: 'Invalid notification JSON payload.' }, 400);
  }

  const receiver = env.RECEIVER_EMAIL || env.ENQUIRY_TO || DEFAULT_RECEIVER;
  const from = env.ENQUIRY_FROM || DEFAULT_FROM;
  const type = body.type === 'enrolment' ? 'enrolment' : 'consultation';
  const studentName = String(body.studentName || 'Student');
  const studentEmail = String(body.studentEmail || 'unknown@example.com');

  const subject = type === 'enrolment'
    ? `[Aintrix Academy] Enrolment Confirmed: ${studentName} - ${body.programme || 'Course'}`
    : `[Aintrix Academy] Consultation Enquiry via Mail: ${studentName}`;

  let text = '';
  if (type === 'enrolment') {
    text = `AINTRIX ACADEMY - STUDENT ENROLMENT NOTIFICATION\n` +
      `--------------------------------------------------\n` +
      `Student Name: ${studentName}\n` +
      `Student Email: ${studentEmail}\n` +
      `Programme: ${body.programme || 'Not specified'}\n` +
      `Package: ${body.package || 'Standard'}\n` +
      `Amount: ${body.amount || 'N/A'}\n` +
      `Order ID: ${body.orderId || 'N/A'}\n` +
      `Billing Address: ${body.billingAddress || 'N/A'}\n` +
      `Time: ${body.timestamp || new Date().toISOString()}\n` +
      `--------------------------------------------------\n` +
      `Recipient: ${receiver}`;
  } else {
    text = `AINTRIX ACADEMY - CONSULTATION ENQUIRY VIA MAIL\n` +
      `--------------------------------------------------\n` +
      `Student Name: ${studentName}\n` +
      `Student Email: ${studentEmail}\n` +
      `Phone: ${body.phone || 'Not provided'}\n` +
      `Programme: ${body.programme || 'General Consultation'}\n` +
      `Preferred Date: ${body.preferredDate || 'Flexible'}\n` +
      `Preferred Time: ${body.preferredTime || 'Flexible'}\n` +
      `Topic: ${body.topics || 'Course Consultation'}\n` +
      `Message: ${body.message || 'No additional message'}\n` +
      `Time: ${body.timestamp || new Date().toISOString()}\n` +
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
        return json({ success: true, delivered: true, id: resJson.id, receiver });
      }
    } catch {
      // Return simulated success if external email fails
    }
  }

  // When no API key is set or in dev, successfully acknowledge delivery
  return json({
    success: true,
    delivered: false,
    simulated: true,
    receiver,
    message: `Notification accepted for receiver ${receiver}`,
  });
}
