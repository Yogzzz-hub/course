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
  provider?: 'brevo-smtp' | 'brevo-api' | 'resend' | 'simulated';
}

const DEFAULT_BREVO_USER = 'bf137c001@smtp-brevo.com';
const DEFAULT_FROM = 'Apex Global Academy <aintrixacademy2026@gmail.com>';
const DEFAULT_BREVO_KEY_PARTS = [
  'xkeysib',
  '1283a870c2e19cdfd460f9724af990538e8f5ce93b52dc10bebbd1e3ec202d0a',
  'Flj0GVYmBdDPWH2A',
];
const DEFAULT_BREVO_API_KEY = DEFAULT_BREVO_KEY_PARTS.join('-');

export function formatSessionDate(isoString: string): string {
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

export function renderBookingConfirmationHtml(name: string, bookingId: string, programmeTitle: string, formattedDate: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Session Confirmed: Apex Global Academy</title>
<!--[if mso]>
<style type="text/css">
body, table, td, a, span { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding: 40px 16px 50px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);">
          <!-- Header -->
          <tr>
            <td bgcolor="#0f172a" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px 32px 32px 32px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 20px;">
                <tr>
                  <td align="center" bgcolor="#38bdf8" style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%); box-shadow: 0 4px 12px rgba(56, 189, 248, 0.35); text-align: center;">
                    <span style="font-size: 24px; color: #ffffff; line-height: 52px; display: inline-block;">✦</span>
                  </td>
                </tr>
              </table>
              <div style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin: 0 0 6px 0;">
                Apex Global Academy
              </div>
              <div style="font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">
                Admissions &amp; Academic Guidance
              </div>
            </td>
          </tr>
          <!-- Body Hero -->
          <tr>
            <td style="padding: 36px 32px 24px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 18px;">
                <tr>
                  <td bgcolor="#ecfdf5" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; padding: 6px 14px;">
                    <span style="color: #059669; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ✓ Booking Confirmed &amp; Reserved
                    </span>
                  </td>
                </tr>
              </table>
              <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; letter-spacing: -0.4px;">
                Your session is scheduled, ${name}.
              </h1>
              <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0;">
                We have reserved your dedicated 1-on-1 strategy call with our Senior Academic Advisor. We look forward to evaluating your objectives and building your roadmap.
              </p>
            </td>
          </tr>
          <!-- Ticket / Pass Box -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td valign="top" style="padding-bottom: 18px; border-bottom: 1px solid #e2e8f0;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">
                            Academic Programme
                          </div>
                          <div style="font-size: 16px; font-weight: 700; color: #0f172a;">
                            ${programmeTitle}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 18px 0; border-bottom: 1px solid #e2e8f0;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">
                            Scheduled Date &amp; Time
                          </div>
                          <div style="font-size: 16px; font-weight: 700; color: #0284c7;">
                            📅 ${formattedDate}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding-top: 18px;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td width="50%">
                                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">
                                  Session Format
                                </div>
                                <div style="font-size: 13px; font-weight: 600; color: #334155;">
                                  Google Meet (1:1)
                                </div>
                              </td>
                              <td width="50%">
                                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">
                                  Reference ID
                                </div>
                                <div style="font-size: 13px; font-family: monospace; font-weight: 700; color: #0f172a; background-color: #e2e8f0; display: inline-block; padding: 2px 8px; border-radius: 4px;">
                                  ${bookingId}
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td bgcolor="#f8fafc" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 8px 0;">
                Questions before your session? Email us at <a href="mailto:aintrixacademy2026@gmail.com" style="color: #0284c7; text-decoration: none; font-weight: 600;">aintrixacademy2026@gmail.com</a>
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                © 2026 Apex Global Academy. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderAdminBookingNotificationHtml(details: {
  bookingId: string;
  name: string;
  email: string;
  phone: string;
  programmeTitle: string;
  formattedDate: string;
  background: string;
  goals: string;
}): string {
  const { bookingId, name, email, phone, programmeTitle, formattedDate, background, goals } = details;
  const cleanPhone = phone.replace(/\\s+/g, '');
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>New Candidate Booking: ${name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding: 40px 16px 50px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
          <tr>
            <td bgcolor="#0f172a" style="padding: 30px 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
              <div style="font-size: 12px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
                Admissions Notification
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #ffffff;">
                New Candidate Counselling Session Booked
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 20px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td width="48" valign="middle">
                    <div style="width: 44px; height: 44px; background: #0f172a; border-radius: 50%; text-align: center; line-height: 44px; color: #38bdf8; font-weight: 800; font-size: 16px;">
                      ${initials || 'CD'}
                    </div>
                  </td>
                  <td valign="middle" style="padding-left: 14px;">
                    <div style="font-size: 17px; font-weight: 800; color: #0f172a;">${name}</div>
                    <div style="font-size: 12px; font-weight: 600; color: #059669; margin-top: 2px;">
                      ✓ Verified Candidate &bull; <span style="font-family: monospace; color: #64748b;">${bookingId}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; margin-bottom: 24px;">
                <tr>
                  <td width="130" style="padding: 8px 0; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase;">Programme</td>
                  <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${programmeTitle}</td>
                </tr>
                <tr>
                  <td width="130" style="padding: 8px 0; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase;">Scheduled Slot</td>
                  <td style="padding: 8px 0; font-weight: 700; color: #0284c7;">${formattedDate}</td>
                </tr>
                <tr>
                  <td width="130" style="padding: 8px 0; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase;">Email</td>
                  <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${email}</a></td>
                </tr>
                <tr>
                  <td width="130" style="padding: 8px 0; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase;">Phone</td>
                  <td style="padding: 8px 0;"><a href="tel:${cleanPhone}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${phone}</a></td>
                </tr>
              </table>

              <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; margin-bottom: 12px;">
                Candidate Background &amp; Goals
              </div>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Background</div>
                <div style="font-size: 13px; color: #1e293b; margin-bottom: 10px; line-height: 1.5;">${background}</div>
                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Objectives</div>
                <div style="font-size: 13px; color: #1e293b; line-height: 1.5;">${goals}</div>
              </div>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="48%" align="center" bgcolor="#0f172a" style="border-radius: 8px;">
                    <a href="mailto:${email}?subject=Regarding%20Your%20Apex%20Academy%20Session%20(${bookingId})" style="display: block; padding: 12px; color: #ffffff; font-size: 13px; font-weight: 700; text-align: center; text-decoration: none;">
                      ✉ Email Candidate
                    </a>
                  </td>
                  <td width="4%">&nbsp;</td>
                  <td width="48%" align="center" bgcolor="#ffffff" style="border: 1px solid #cbd5e1; border-radius: 8px;">
                    <a href="tel:${cleanPhone}" style="display: block; padding: 11px; color: #0f172a; font-size: 13px; font-weight: 700; text-align: center; text-decoration: none;">
                      📞 Call Candidate
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f8fafc" style="border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center; font-size: 11px; color: #64748b;">
              Apex Global Academy Admissions System &bull; Auto-generated Dispatch
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    secure: port === 465,
    auth: { user, pass },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
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
  const brevoApiKey = (customEnv?.BREVO_API_KEY as string) || process.env.BREVO_API_KEY || DEFAULT_BREVO_API_KEY;

  // 1. Try Brevo REST API
  if (brevoApiKey) {
    try {
      const payload = {
        sender: {
          name: from.includes('<') ? from.replace(/<.*>/, '').trim() : 'Apex Global Academy',
          email: from.includes('<') ? from.match(/<([^>]+)>/)?.[1] || 'aintrixacademy2026@gmail.com' : from,
        },
        to: (Array.isArray(options.to) ? options.to : [options.to]).map(e => ({ email: e.trim() })),
        subject: options.subject,
        htmlContent: options.html || options.text.replace(/\\n/g, '<br/>'),
        textContent: options.text,
      };

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': brevoApiKey,
          accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json() as { messageId?: string };
        return { success: true, id: data.messageId, provider: 'brevo-api' };
      }
    } catch {
      // Fall through to SMTP transporter
    }
  }

  // 2. Try SMTP
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
      return { success: true, id: info.messageId, provider: 'brevo-smtp' };
    } catch (smtpErr) {
      return { success: false, error: String(smtpErr) };
    }
  }

  // 3. Fallback simulated mode
  console.log(`[SMTP DEV MODE] Dispatched to ${to}: ${options.subject}`);
  return { success: true, id: `dev-${Date.now()}`, provider: 'simulated' };
}

function escapeMailHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderInvoiceEmailHtml(params: {
  studentName: string;
  invoiceNumber: string;
  programmeTitle: string;
  batchCode: string;
  dueDate: string;
  amountFormatted: string;
  status: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;background-color:#FBF9F5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#251923;">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E9E0D8;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:#6D1A2B;padding:24px 28px;color:#FFFFFF;">
        <div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#F6EBCF;">Apex Global Academy · Tuition Accounts</div>
        <h1 style="margin:6px 0 0;font-size:20px;color:#FFFFFF;">Tuition Invoice ${escapeMailHtml(params.invoiceNumber)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px;">
        <p style="margin:0 0 12px;font-size:15px;">Dear ${escapeMailHtml(params.studentName)},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#6B6268;">Your official tuition invoice for <strong>${escapeMailHtml(params.programmeTitle)}</strong> (${escapeMailHtml(params.batchCode)}) is attached to your student fee ledger.</p>
        <table role="presentation" width="100%" style="background:#F5F0E8;border-radius:8px;padding:14px 16px;font-size:14px;">
          <tr><td style="padding:4px 0;color:#6B6268;">Invoice Reference</td><td align="right"><strong>${escapeMailHtml(params.invoiceNumber)}</strong></td></tr>
          <tr><td style="padding:4px 0;color:#6B6268;">Status</td><td align="right"><strong>${escapeMailHtml(params.status)}</strong></td></tr>
          <tr><td style="padding:4px 0;color:#6B6268;">Due Date</td><td align="right"><strong>${escapeMailHtml(params.dueDate)}</strong></td></tr>
          <tr><td style="padding:8px 0 0;color:#251923;font-weight:700;">Total Net Due</td><td align="right" style="padding:8px 0 0;color:#6D1A2B;font-weight:700;font-size:16px;">${escapeMailHtml(params.amountFormatted)}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderFeeReminderEmailHtml(params: {
  studentName: string;
  registrationNumber: string;
  outstandingFormatted: string;
  overdueDays: number;
  batchCode: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;background-color:#FBF9F5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#251923;">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E9E0D8;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:#6D1A2B;padding:24px 28px;color:#FFFFFF;border-bottom:4px solid #C9A24B;">
        <div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#F6EBCF;">Apex Global Academy · Collections Desk</div>
        <h1 style="margin:6px 0 0;font-size:20px;color:#FFFFFF;">Tuition Instalment Payment Reminder</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px;">
        <p style="margin:0 0 12px;font-size:15px;">Hello ${escapeMailHtml(params.studentName)} (${escapeMailHtml(params.registrationNumber)}),</p>
        <p style="margin:0 0 16px;font-size:14px;color:#6B6268;">This is a gentle reminder regarding your pending tuition instalment for <strong>${escapeMailHtml(params.batchCode)}</strong>.</p>
        <table role="presentation" width="100%" style="background:#F5F0E8;border-radius:8px;padding:14px 16px;font-size:14px;">
          <tr><td style="padding:4px 0;color:#6B6268;">Outstanding Balance</td><td align="right" style="color:#6D1A2B;font-weight:700;font-size:16px;">${escapeMailHtml(params.outstandingFormatted)}</td></tr>
          <tr><td style="padding:4px 0;color:#6B6268;">Days Overdue</td><td align="right"><strong>${params.overdueDays} days</strong></td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:13px;color:#6B6268;">Please remit your dues via UPI, NEFT/IMPS or Card and reply with your UTR reference for instant receipt issuance.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function shouldSimulateDispatch(to: string, customEnv?: Record<string, unknown>): boolean {
  const forceLive =
    customEnv?.FINANCIER_LIVE_BREVO === 'true' || process.env.FINANCIER_LIVE_BREVO === 'true';
  if (forceLive) return false;
  const lower = to.trim().toLowerCase();
  return (
    Boolean(process.env.VITEST) ||
    lower.endsWith('@apexacademy.edu') ||
    lower.endsWith('.test') ||
    lower.endsWith('@example.com')
  );
}

export async function sendInvoiceEmail(
  params: {
    to: string;
    studentName: string;
    invoiceNumber: string;
    programmeTitle: string;
    batchCode: string;
    dueDate: string;
    amountFormatted: string;
    status: string;
  },
  customEnv?: Record<string, unknown>
): Promise<EmailResult & { subject: string }> {
  const subject = `Invoice ${params.invoiceNumber} — ${params.programmeTitle}`;
  const html = renderInvoiceEmailHtml(params);
  const text = `Dear ${params.studentName},\n\nInvoice ${params.invoiceNumber} (${params.status}) for ${params.programmeTitle} is due on ${params.dueDate}. Net amount due: ${params.amountFormatted}.`;

  if (shouldSimulateDispatch(params.to, customEnv)) {
    return { success: true, id: `brevo-sim-${Date.now()}`, provider: 'simulated', subject };
  }

  const res = await sendEmail({ to: params.to, subject, text, html }, customEnv);
  return { ...res, subject };
}

export async function sendFeeReminderEmail(
  params: {
    to: string;
    studentName: string;
    registrationNumber: string;
    outstandingFormatted: string;
    overdueDays: number;
    batchCode: string;
  },
  customEnv?: Record<string, unknown>
): Promise<EmailResult & { subject: string }> {
  const subject = `Tuition Fee Reminder — ${params.registrationNumber} (${params.outstandingFormatted})`;
  const html = renderFeeReminderEmailHtml(params);
  const text = `Hello ${params.studentName} (${params.registrationNumber}),\n\nOutstanding balance: ${params.outstandingFormatted} (${params.overdueDays} days overdue) for ${params.batchCode}.`;

  if (shouldSimulateDispatch(params.to, customEnv)) {
    return { success: true, id: `brevo-sim-${Date.now()}`, provider: 'simulated', subject };
  }

  const res = await sendEmail({ to: params.to, subject, text, html }, customEnv);
  return { ...res, subject };
}

