import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
  provider?: 'brevo-smtp' | 'resend' | 'simulated';
}

const DEFAULT_BREVO_USER = 'bf137c001@smtp-brevo.com';
const DEFAULT_FROM = 'Aintrix Academy <aintrixacademy2026@gmail.com>';

export function isEmailConfigured(): boolean {
  const hasSmtp = Boolean(
    process.env.SMTP_PASS ||
    process.env.BREVO_SMTP_KEY
  );
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  return hasSmtp || hasResend;
}

export function createSmtpTransporter() {
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || DEFAULT_BREVO_USER;
  const pass = process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY;

  if (!pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user,
      pass,
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false, // Prevents self-signed or proxy TLS handshakes from breaking
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const from = options.from || process.env.SMTP_FROM || process.env.ENQUIRY_FROM || DEFAULT_FROM;
  const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;

  // 1. Try Brevo SMTP via nodemailer
  const transporter = createSmtpTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      return {
        success: true,
        id: info.messageId,
        provider: 'brevo-smtp',
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Mailer] Brevo SMTP delivery error:', errorMsg);

      // If resend is also configured, attempt fallback
      if (!process.env.RESEND_API_KEY) {
        return {
          success: false,
          error: errorMsg,
          provider: 'brevo-smtp',
        };
      }
    }
  }

  // 2. Fallback to Resend API if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: Array.isArray(options.to) ? options.to : [options.to],
          reply_to: options.replyTo,
          subject: options.subject,
          text: options.text,
          html: options.html,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json() as { id?: string };
        return {
          success: true,
          id: data.id,
          provider: 'resend',
        };
      }
      const errText = await res.text();
      return {
        success: false,
        error: `Resend error: ${errText}`,
        provider: 'resend',
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: errorMsg,
        provider: 'resend',
      };
    }
  }

  // 3. In dev / simulated fallback mode
  return {
    success: true,
    id: `simulated_${Date.now()}`,
    provider: 'simulated',
  };
}
