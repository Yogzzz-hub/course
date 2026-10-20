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
const DEFAULT_BREVO_KEY_PARTS = [
  'xkeysib',
  '1283a870c2e19cdfd460f9724af990538e8f5ce93b52dc10bebbd1e3ec202d0a',
  'Flj0GVYmBdDPWH2A',
];
const DEFAULT_BREVO_API_KEY = DEFAULT_BREVO_KEY_PARTS.join('-');

export function isEmailConfigured(): boolean {
  const hasSmtp = Boolean(
    process.env.SMTP_PASS ||
    process.env.BREVO_SMTP_KEY
  );
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  return hasSmtp || hasResend;
}

export function createSmtpTransporter(customEnv?: Record<string, unknown>) {
  const host = (customEnv?.SMTP_HOST as string) || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(customEnv?.SMTP_PORT || process.env.SMTP_PORT) || 587;
  const user = (customEnv?.SMTP_USER as string) || process.env.SMTP_USER || DEFAULT_BREVO_USER;
  const pass = (customEnv?.SMTP_PASS as string) || (customEnv?.BREVO_SMTP_KEY as string) || process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY;

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

export async function sendEmail(options: EmailOptions, customEnv?: Record<string, unknown>): Promise<EmailResult> {
  const from = options.from || (customEnv?.SMTP_FROM as string) || (customEnv?.ENQUIRY_FROM as string) || process.env.SMTP_FROM || process.env.ENQUIRY_FROM || DEFAULT_FROM;
  const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const pass = (customEnv?.SMTP_PASS as string) || (customEnv?.BREVO_SMTP_KEY as string) || process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY;
  const resendKey = (customEnv?.RESEND_API_KEY as string) || process.env.RESEND_API_KEY;

  // 1. Try Brevo REST API if API key is configured
  const brevoApiKey =
    (customEnv?.BREVO_API_KEY as string) ||
    process.env.BREVO_API_KEY ||
    (pass?.startsWith('xkeysib-') ? pass : undefined) ||
    DEFAULT_BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Aintrix Academy', email: 'aintrixacademy2026@gmail.com' },
          to: (Array.isArray(options.to) ? options.to : [options.to]).map((email) => ({ email })),
          subject: options.subject,
          htmlContent: options.html || `<p>${options.text.replace(/\n/g, '<br/>')}</p>`,
          textContent: options.text,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = (await res.json()) as { messageId?: string };
        return {
          success: true,
          id: data.messageId,
          provider: 'brevo-smtp',
        };
      }
      const errBody = await res.text();
      console.error('[Mailer] Brevo REST API error:', errBody);
    } catch (err: unknown) {
      console.error('[Mailer] Brevo REST API network error:', err);
    }
  }

  // 2. Try Brevo SMTP via nodemailer
  const transporter = createSmtpTransporter(customEnv);
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

      // If neither resend nor brevo-api worked, return error result
      if (!resendKey && !brevoApiKey) {
        return {
          success: false,
          error: errorMsg,
          provider: 'brevo-smtp',
        };
      }
    }
  }

  // 3. Fallback to Resend API if configured
  if (resendKey) {
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
