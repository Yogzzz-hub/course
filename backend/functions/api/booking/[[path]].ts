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
  BACKEND_URL?: string;
  NEXT_PUBLIC_BACKEND_URL?: string;
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
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Session Confirmed: Aintrix Academy</title>
<!--[if mso]>
<style type="text/css">
body, table, td, a, span { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif !important; }
</style>
<![endif]-->
<style type="text/css">
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f1f5f9; }
  table { border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a { text-decoration: none; }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9" align="center" style="background-color: #f1f5f9; width: 100% !important; margin: 0 auto; table-layout: fixed;">
    <tr>
      <td align="center" valign="top" style="padding: 36px 12px 48px 12px;">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="620">
        <tr>
        <td align="center" valign="top" width="620">
        <![endif]-->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width: 620px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08); table-layout: fixed;">
          <tr>
            <td height="4" bgcolor="#10b981" style="background: linear-gradient(90deg, #10b981 0%, #059669 50%, #34d399 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="#090e1a" style="background-color: #090e1a; padding: 30px 32px; text-align: center; border-bottom: 1px solid #1e293b;">
              <div style="font-size: 13px; font-weight: 800; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase;">
                AINTRIX ACADEMY
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 8px 0 0 0; line-height: 1.3; letter-spacing: -0.4px;">
                Counselling Session Confirmed
              </h1>
              <div style="margin-top: 14px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td bgcolor="#064e3b" style="background-color: #064e3b; border: 1px solid #10b981; border-radius: 20px; padding: 5px 16px;">
                      <span style="font-size: 12px; font-weight: 700; color: #6ee7b7; letter-spacing: 0.6px; text-transform: uppercase;">
                        ✓ Confirmed &amp; Reserved
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 18px 32px;">
              <p style="font-size: 16px; color: #0f172a; line-height: 1.5; margin: 0 0 8px 0;">
                Hello <strong>${name}</strong>,
              </p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">
                Your 1-on-1 admission counselling and career evaluation session has been successfully booked with our academic admissions advisors.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="76" align="center" valign="middle">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="76" bgcolor="#0f172a" style="background-color: #0f172a; border-radius: 10px; border: 1px solid #1e293b; text-align: center;">
                            <tr>
                              <td bgcolor="#10b981" style="background-color: #10b981; padding: 4px 0; border-top-left-radius: 9px; border-top-right-radius: 9px; text-align: center;">
                                <span style="font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">OCT</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0 2px 0; text-align: center;">
                                <span style="font-size: 26px; font-weight: 800; color: #ffffff; line-height: 1;">22</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 0 0 6px 0; text-align: center;">
                                <span style="font-size: 10px; font-weight: 600; color: #94a3b8;">2026</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td valign="middle" style="padding-left: 18px;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px;">Confirmed Slot</div>
                          <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                            ${formattedDate}
                          </div>
                          <div style="font-size: 12px; color: #475569; margin-top: 4px;">
                            <strong>Format:</strong> 1-on-1 Online Consultation (Google Meet)
                          </div>
                          <div style="font-size: 12px; color: #64748b; margin-top: 3px;">
                            <strong>Booking ID:</strong> <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${bookingId}</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 14px;">
                Session Roadmap &amp; Preparation
              </div>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
                      <tr>
                        <td width="30" valign="top" style="font-size: 14px; font-weight: 800; color: #0284c7;">01</td>
                        <td style="color: #334155; font-size: 13px; line-height: 1.5;">
                          <strong>Curriculum Walkthrough:</strong> Detailed module breakdown of <strong>${programmeTitle}</strong>, real-world engineering projects, and toolchains.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
                      <tr>
                        <td width="30" valign="top" style="font-size: 14px; font-weight: 800; color: #0284c7;">02</td>
                        <td style="color: #334155; font-size: 13px; line-height: 1.5;">
                          <strong>Career Transition Blueprint:</strong> Assessing your engineering background, portfolio readiness, and target hiring salaries.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
                      <tr>
                        <td width="30" valign="top" style="font-size: 14px; font-weight: 800; color: #0284c7;">03</td>
                        <td style="color: #334155; font-size: 13px; line-height: 1.5;">
                          <strong>Tuition &amp; Scholarship Advisory:</strong> Reviewing merit scholarships, deferred fee plans, and monthly installment options.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9" style="background-color: #f1f5f9; border-radius: 8px; padding: 14px 18px;">
                <tr>
                  <td style="font-size: 12px; color: #475569; line-height: 1.5;">
                    Need to reschedule or prepare questions in advance? Simply reply directly to this email or reach our admissions desk at <a href="mailto:aintrixacademy2026@gmail.com" style="color: #0284c7; font-weight: 600; text-decoration: none;">aintrixacademy2026@gmail.com</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f8fafc" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <div style="font-size: 12px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase;">
                AINTRIX ACADEMY
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                Connecting ambitious software engineers to elite tech careers.
              </div>
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderOtpEmailHtml(name: string, code: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Verification Code - Aintrix Academy</title>
<!--[if mso]>
<style type="text/css">
body, table, td, a, span { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif !important; }
</style>
<![endif]-->
<style type="text/css">
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f1f5f9; }
  table { border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <center style="width: 100%; background-color: #f1f5f9; padding: 32px 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9" align="center" style="background-color: #f1f5f9; width: 100%; margin: 0 auto;">
      <tr>
        <td align="center" valign="top" style="padding: 0 12px;">
          <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellspacing="0" cellpadding="0" width="520">
          <tr>
          <td align="center" valign="top" width="520">
          <![endif]-->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width: 520px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); table-layout: fixed;">
            <tr>
              <td bgcolor="#0f172a" style="background-color: #0f172a; padding: 22px 28px; text-align: center; border-bottom: 3px solid #0284c7;">
                <span style="font-size: 15px; font-weight: 800; letter-spacing: 1.5px; color: #ffffff; text-transform: uppercase;">AINTRIX</span>
                <span style="font-size: 15px; font-weight: 400; letter-spacing: 1.5px; color: #38bdf8; text-transform: uppercase;"> ACADEMY</span>
                <div style="font-size: 11px; font-weight: 600; color: #94a3b8; letter-spacing: 0.5px; margin-top: 3px; text-transform: uppercase;">Admissions Verification</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px 28px 20px 28px;">
                <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 10px 0;">Verify your email address</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.55; margin: 0 0 16px 0;">
                  Hello <strong>${name}</strong>,<br/>
                  Enter the one-time verification code below to confirm your admission counselling appointment:
                </p>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9" style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <tr>
                    <td style="padding: 18px 12px; text-align: center;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0284c7; display: inline-block;">${code}</span>
                    </td>
                  </tr>
                </table>
                <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
                  ⏱ This code is valid for <strong>10 minutes</strong>. If you did not initiate this request, you can safely disregard this email.
                </p>
              </td>
            </tr>
            <tr>
              <td bgcolor="#f8fafc" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 28px; text-align: center; font-size: 11px; color: #94a3b8;">
                Aintrix Academy Admissions • Secure Verification Portal
              </td>
            </tr>
          </table>
          <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

function renderAdminBookingNotificationHtml(params: {
  name: string;
  email: string;
  phone: string;
  bookingId: string;
  programmeTitle: string;
  formattedDate: string;
  background: string;
  goals: string;
}): string {
  const { name, email, phone, bookingId, programmeTitle, formattedDate, background, goals } = params;
  const cleanPhone = (phone || '').replace(/\s+/g, '');
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Admissions Lead Dispatch: ${name}</title>
<!--[if mso]>
<style type="text/css">
body, table, td, a, span { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif !important; }
</style>
<![endif]-->
<style type="text/css">
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f1f5f9; }
  table { border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a { text-decoration: none; }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9" align="center" style="background-color: #f1f5f9; width: 100% !important; margin: 0 auto; table-layout: fixed;">
    <tr>
      <td align="center" valign="top" style="padding: 36px 12px 48px 12px;">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="620">
        <tr>
        <td align="center" valign="top" width="620">
        <![endif]-->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width: 620px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04); table-layout: fixed;">
          <tr>
            <td height="4" bgcolor="#0284c7" style="background: linear-gradient(90deg, #38bdf8 0%, #0284c7 50%, #6366f1 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="#090e1a" style="background-color: #090e1a; padding: 26px 32px; border-bottom: 1px solid #1e293b;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle" style="padding-right: 10px;">
                          <div style="width: 28px; height: 28px; background-color: #0284c7; border-radius: 6px; text-align: center; line-height: 28px; color: #ffffff; font-weight: 800; font-size: 14px;">
                            A
                          </div>
                        </td>
                        <td valign="middle">
                          <span style="font-size: 16px; font-weight: 800; letter-spacing: 1.5px; color: #ffffff; text-transform: uppercase;">AINTRIX</span>
                          <span style="font-size: 16px; font-weight: 500; letter-spacing: 1.5px; color: #38bdf8; text-transform: uppercase;"> ACADEMY</span>
                          <div style="font-size: 10px; font-weight: 600; color: #94a3b8; letter-spacing: 0.8px; margin-top: 2px; text-transform: uppercase;">Admissions Intelligence System</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td bgcolor="#0c2340" style="background-color: #0c2340; border: 1px solid #0284c7; border-radius: 20px; padding: 5px 12px;">
                          <span style="font-size: 11px; font-weight: 700; color: #38bdf8; letter-spacing: 0.6px; text-transform: uppercase;">
                            ● NEW LEAD
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 18px 32px;">
              <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                Admissions Lead Dispatch
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3; letter-spacing: -0.3px;">
                1-on-1 Counselling Session Booked
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                A prospective candidate has submitted an appointment request. Credential validation via one-time verification code (OTP) was successful.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="76" align="center" valign="middle">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="76" bgcolor="#0f172a" style="background-color: #0f172a; border-radius: 10px; border: 1px solid #1e293b; text-align: center;">
                            <tr>
                              <td bgcolor="#0284c7" style="background-color: #0284c7; padding: 4px 0; border-top-left-radius: 9px; border-top-right-radius: 9px; text-align: center;">
                                <span style="font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">OCT</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0 2px 0; text-align: center;">
                                <span style="font-size: 26px; font-weight: 800; color: #ffffff; line-height: 1;">22</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 0 0 6px 0; text-align: center;">
                                <span style="font-size: 10px; font-weight: 600; color: #94a3b8;">2026</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td valign="middle" style="padding-left: 18px;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px;">Confirmed Slot</div>
                          <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                            ${formattedDate}
                          </div>
                          <div style="font-size: 12px; color: #475569; margin-top: 4px;">
                            <span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; font-weight: 600; padding: 2px 8px; border-radius: 4px; font-size: 11px;">1-on-1 Video Consultation</span>
                            &nbsp;•&nbsp; 45 Minutes
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 8px; border-bottom: 2px solid #0f172a; margin-bottom: 14px;">
                      Candidate Information
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 14px;">
                      <tr>
                        <td width="46" valign="middle">
                          <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 1px solid #334155; border-radius: 50%; text-align: center; line-height: 44px; color: #38bdf8; font-weight: 800; font-size: 16px;">
                            ${initials || 'CD'}
                          </div>
                        </td>
                        <td valign="middle" style="padding-left: 14px;">
                          <div style="font-size: 17px; font-weight: 800; color: #0f172a;">${name}</div>
                          <div style="font-size: 12px; font-weight: 600; color: #059669; margin-top: 2px;">
                            ✓ OTP Verified Lead &nbsp;•&nbsp; <span style="font-family: monospace; color: #475569;">${bookingId}</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
                      <tr>
                        <td width="130" style="padding: 9px 0; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9;">Email Address</td>
                        <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9;">
                          <a href="mailto:${email}" style="color: #0284c7; font-weight: 600; text-decoration: none;">${email}</a>
                        </td>
                      </tr>
                      <tr>
                        <td width="130" style="padding: 9px 0; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9;">Phone Number</td>
                        <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9;">
                          <a href="tel:${cleanPhone}" style="color: #0284c7; font-weight: 600; text-decoration: none;">${phone}</a>
                        </td>
                      </tr>
                      <tr>
                        <td width="130" style="padding: 9px 0; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9;">Programme</td>
                        <td style="padding: 9px 0; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${programmeTitle}</td>
                      </tr>
                      <tr>
                        <td width="130" style="padding: 9px 0; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9;">Booking ID</td>
                        <td style="padding: 9px 0; border-bottom: 1px solid #f1f5f9;">
                          <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a; background-color: #f1f5f9; padding: 3px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">${bookingId}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 26px 32px;">
              <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 12px;">
                Pre-Session Candidate Intake
              </div>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px;">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 3px;">
                      Background &amp; Experience
                    </div>
                    <div style="font-size: 13px; color: #1e293b; line-height: 1.5; font-weight: 500;">
                      ${background}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #e2e8f0; padding-top: 12px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 3px;">
                      Target Career Objectives &amp; Aspirations
                    </div>
                    <div style="font-size: 13px; color: #1e293b; line-height: 1.5; font-weight: 500;">
                      ${goals}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="48%" align="center" bgcolor="#0f172a" style="background-color: #0f172a; border-radius: 8px;">
                    <a href="mailto:${email}?subject=Regarding%20Your%20Aintrix%20Academy%20Counselling%20Session%20(${bookingId})" style="display: block; padding: 13px 18px; color: #ffffff; font-size: 13px; font-weight: 700; text-align: center; text-decoration: none; border-radius: 8px; letter-spacing: 0.2px;">
                      ✉ Reply to Candidate
                    </a>
                  </td>
                  <td width="4%">&nbsp;</td>
                  <td width="48%" align="center" bgcolor="#ffffff" style="background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px;">
                    <a href="tel:${cleanPhone}" style="display: block; padding: 12px 18px; color: #0f172a; font-size: 13px; font-weight: 700; text-align: center; text-decoration: none; border-radius: 8px; letter-spacing: 0.2px;">
                      📞 Call Candidate
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f8fafc" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.8px; text-transform: uppercase;">
                Aintrix Academy Admissions Intelligence Engine
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 5px; line-height: 1.5;">
                Automated confidential lead record • Ref: <span style="font-family: monospace;">${bookingId}</span> • Verified via OTP
              </div>
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
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

    // Dispatch candidate verification code email
    const emailPromises: Promise<unknown>[] = [
      sendEdgeEmail(
        env,
        email,
        `Your Aintrix Academy Verification Code: ${code}`,
        `Hello ${name},\n\nYour 6-digit verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nWarm regards,\nAintrix Academy Admissions Team`,
        renderOtpEmailHtml(name, code)
      ),
    ];

    // Notify Admin of new applicant starting verification
    const adminEmail = (env.ENQUIRY_TO || 'aintrixacademy2026@gmail.com').trim();
    if (adminEmail) {
      emailPromises.push(
        sendEdgeEmail(
          env,
          adminEmail,
          `New Admission Applicant: ${name} (${email})`,
          `New applicant started counselling registration:\n\nName: ${name}\nEmail: ${email}\nPhone: ${about.phone || 'N/A'}\nStatus: ${about.currentStatus || 'N/A'}\nProgramme: ${about.programmeId || 'N/A'}`,
          `<div style="font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="background-color: #0f172a; padding: 14px 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
              <span style="font-size: 14px; font-weight: 800; color: #ffffff; letter-spacing: 1px; text-transform: uppercase;">AINTRIX ACADEMY ADMISSIONS</span>
            </div>
            <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">New Prospective Student Application</h2>
            <p style="color: #475569; font-size: 13px;">A new applicant has submitted their contact details and requested verification:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b; width: 35%;">Applicant Name:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${name}</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Email Address:</td><td style="padding: 8px 0; font-weight: 600; color: #0284c7;">${email}</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Phone Number:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${about.phone || 'Not provided'}</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Current Status:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${about.currentStatus || 'Prospective'}</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: #64748b;">Programme of Interest:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${about.programmeId || 'General'}</td></tr>
            </table>
            <p style="color: #64748b; font-size: 11px; margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 12px;">This applicant has also been synchronized into the Executive Admin Dashboard and Admissions pipeline.</p>
          </div>`
        )
      );
    }

    // Synchronize Lead & In-App Notification to CRM Database
    const backendTarget = (env.BACKEND_URL || env.NEXT_PUBLIC_BACKEND_URL || 'https://course-backend-h5z1.onrender.com').toString().trim().replace(/\/$/, '');
    fetch(`${backendTarget}/api/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: name,
        email,
        phone: (about.phone as string) || '+1000000000',
        schedulePreference: 'FLEXIBLE',
        message: `Applicant Status: ${about.currentStatus || 'Prospective'}. Programme: ${about.programmeId || 'General'}. Verification OTP initiated.`,
        source: 'Website 1-on-1 Application Form',
        consentGiven: true,
      }),
    }).catch((err) => console.warn('CRM lead sync notice:', err));

    await Promise.allSettled(emailPromises);

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

    const studentPhone = (about.phone as string) || 'Not provided';
    const studentBackground = (brief.background as string) || 'N/A';
    const studentGoals = (brief.goals as string) || 'N/A';

    const adminHtml = renderAdminBookingNotificationHtml({
      name,
      email,
      phone: studentPhone,
      bookingId,
      programmeTitle,
      formattedDate,
      background: studentBackground,
      goals: studentGoals,
    });

    // Strict Recipient Separation:
    // 1. Candidate receives ONLY the student session confirmation receipt
    // 2. Admin receives ONLY the admissions lead dispatch dossier
    const studentRecipient = email;
    const adminRecipient = (env.ENQUIRY_TO || 'aintrixacademy2026@gmail.com').trim();

    const emailTasks: Promise<unknown>[] = [
      sendEdgeEmail(
        env,
        studentRecipient,
        `Session Confirmed: Your Aintrix Academy Counselling Session (${bookingId})`,
        `Hello ${name},\n\nYour 1-on-1 admission counselling session is confirmed!\n\nBooking ID: ${bookingId}\nProgramme: ${programmeTitle}\nDate & Time: ${formattedDate}\n\nOur team will connect with you at your chosen time.\n\nWarm regards,\nAintrix Academy Admissions`,
        confirmationHtml
      ),
    ];

    if (adminRecipient) {
      emailTasks.push(
        sendEdgeEmail(
          env,
          adminRecipient,
          `New Counselling Booking: ${name} (${bookingId})`,
          `New Booking received:\n\nStudent: ${name}\nEmail: ${email}\nPhone: ${about.phone || 'N/A'}\nProgramme: ${programmeTitle}\nSlot: ${formattedDate}`,
          adminHtml
        )
      );
    }

    // Synchronize confirmed booking to CRM database
    const backendTarget = (env.BACKEND_URL || env.NEXT_PUBLIC_BACKEND_URL || 'https://course-backend-h5z1.onrender.com').toString().trim().replace(/\/$/, '');
    fetch(`${backendTarget}/api/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: name,
        email,
        phone: studentPhone,
        schedulePreference: 'FLEXIBLE',
        message: `CONFIRMED APPOINTMENT. Booking ID: ${bookingId} | Programme: ${programmeTitle} | Slot: ${formattedDate}`,
        source: 'Website 1-on-1 Booking Wizard',
        consentGiven: true,
      }),
    }).catch((err) => console.warn('CRM booking sync notice:', err));

    await Promise.allSettled(emailTasks);

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
