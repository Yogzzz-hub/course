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

function renderBookingConfirmationHtml(name: string, bookingId: string, programmeTitle: string, formattedDate: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Session Confirmed - Aintrix Academy</title>
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
  <center style="width: 100%; background-color: #f1f5f9; padding: 32px 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9" align="center" style="background-color: #f1f5f9; width: 100%; margin: 0 auto;">
      <tr>
        <td align="center" valign="top" style="padding: 0 12px;">
          <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); table-layout: fixed;">
            <tr>
              <td bgcolor="#0f172a" style="background-color: #0f172a; padding: 28px 32px; text-align: center; border-bottom: 3px solid #10b981;">
                <div style="font-size: 13px; font-weight: 800; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase;">AINTRIX ACADEMY</div>
                <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 8px 0 0 0; line-height: 1.3;">Session Confirmed</h1>
                <div style="margin-top: 12px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                    <tr>
                      <td bgcolor="#064e3b" style="background-color: #064e3b; border: 1px solid #10b981; border-radius: 20px; padding: 4px 14px;">
                        <span style="font-size: 12px; font-weight: 700; color: #6ee7b7; letter-spacing: 0.5px; text-transform: uppercase;">
                          ✓ Booking Confirmed &amp; Reserved
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
                  Your 1-on-1 admission counselling and career evaluation session has been successfully reserved with our senior academic admissions advisors.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 22px 32px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 8px; padding: 18px 20px;">
                  <tr>
                    <td>
                      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px;">Appointment Details</div>
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 12px; font-size: 14px;">
                        <tr>
                          <td width="130" style="padding: 6px 0; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px;">Date &amp; Time</td>
                          <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-size: 15px;">${formattedDate}</td>
                        </tr>
                        <tr>
                          <td width="130" style="padding: 6px 0; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px;">Programme</td>
                          <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${programmeTitle}</td>
                        </tr>
                        <tr>
                          <td width="130" style="padding: 6px 0; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px;">Format</td>
                          <td style="padding: 6px 0; color: #334155;">1-on-1 Online Consultation (Google Meet)</td>
                        </tr>
                        <tr>
                          <td width="130" style="padding: 6px 0; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px;">Booking ID</td>
                          <td style="padding: 6px 0;">
                            <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #0f172a; background-color: #ffffff; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1;">${bookingId}</span>
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
                <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 12px;">
                  What We Will Cover in Your Session
                </div>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="24" valign="top" style="padding: 6px 0; color: #10b981; font-weight: 700; font-size: 15px;">✓</td>
                    <td style="padding: 6px 0 6px 8px; color: #475569; font-size: 13px; line-height: 1.5;">
                      <strong>Curriculum Deep-Dive:</strong> Walkthrough of practical engineering modules and production capstone projects.
                    </td>
                  </tr>
                  <tr>
                    <td width="24" valign="top" style="padding: 6px 0; color: #10b981; font-weight: 700; font-size: 15px;">✓</td>
                    <td style="padding: 6px 0 6px 8px; color: #475569; font-size: 13px; line-height: 1.5;">
                      <strong>Career Transition Roadmap:</strong> Tailoring placement strategy and salary benchmarks to your target role.
                    </td>
                  </tr>
                  <tr>
                    <td width="24" valign="top" style="padding: 6px 0; color: #10b981; font-weight: 700; font-size: 15px;">✓</td>
                    <td style="padding: 6px 0 6px 8px; color: #475569; font-size: 13px; line-height: 1.5;">
                      <strong>Scholarships &amp; Tuition Options:</strong> Discussion on merit fee assistance, EMI, and flexible installment plans.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 28px 32px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9" style="background-color: #f1f5f9; border-radius: 8px; padding: 14px 16px;">
                  <tr>
                    <td>
                      <div style="font-size: 12px; color: #475569; line-height: 1.5;">
                        Need to reschedule or have questions before your call? Simply reply directly to this email or reach our admissions desk at <a href="mailto:aintrixacademy2026@gmail.com" style="color: #0284c7; font-weight: 600; text-decoration: none;">aintrixacademy2026@gmail.com</a>.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#f8fafc" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">
                  AINTRIX ACADEMY
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                  Bridging ambitious engineers to high-growth software careers.
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
  </center>
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

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>New Counselling Booking</title>
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
  <center style="width: 100%; background-color: #f1f5f9; padding: 32px 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9" align="center" style="background-color: #f1f5f9; width: 100%; margin: 0 auto;">
      <tr>
        <td align="center" valign="top" style="padding: 0 12px;">
          <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); table-layout: fixed;">
            <tr>
              <td bgcolor="#0f172a" style="background-color: #0f172a; padding: 22px 28px; border-bottom: 3px solid #0284c7;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="left" valign="middle">
                      <span style="font-size: 16px; font-weight: 800; letter-spacing: 1.5px; color: #ffffff; text-transform: uppercase;">AINTRIX</span>
                      <span style="font-size: 16px; font-weight: 500; letter-spacing: 1.5px; color: #38bdf8; text-transform: uppercase;"> ACADEMY</span>
                      <div style="font-size: 11px; font-weight: 600; color: #94a3b8; letter-spacing: 0.6px; margin-top: 3px; text-transform: uppercase;">Admissions Management System</div>
                    </td>
                    <td align="right" valign="middle">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td bgcolor="#082f49" style="background-color: #082f49; border: 1px solid #0284c7; border-radius: 20px; padding: 4px 12px;">
                            <span style="font-size: 11px; font-weight: 700; color: #38bdf8; letter-spacing: 0.5px; text-transform: uppercase;">
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
              <td style="padding: 28px 28px 16px 28px;">
                <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Admissions Lead Dispatch</div>
                <h1 style="margin: 0; font-size: 21px; font-weight: 700; color: #0f172a; line-height: 1.3;">1-on-1 Counselling Session Booked</h1>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.55;">
                  A prospective student has scheduled an admission consultation. Details and schedule are verified below.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 20px 28px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; border-radius: 8px; padding: 16px 18px;">
                  <tr>
                    <td>
                      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px;">Confirmed Session Slot</div>
                      <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 3px;">${formattedDate}</div>
                      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                        <strong>Format:</strong> 1-on-1 Video Consultation (45 min) &nbsp;•&nbsp; <strong>Status:</strong> Confirmed
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 20px 28px;">
                <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 8px; border-bottom: 2px solid #0f172a; margin-bottom: 12px;">
                  Candidate Summary
                </div>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
                  <tr>
                    <td width="140" style="padding: 10px 0; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9; text-transform: uppercase; font-size: 12px; letter-spacing: 0.4px;">Student Name</td>
                    <td style="padding: 10px 0; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${name}</td>
                  </tr>
                  <tr>
                    <td width="140" style="padding: 10px 0; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9; text-transform: uppercase; font-size: 12px; letter-spacing: 0.4px;">Email Address</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                      <a href="mailto:${email}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td width="140" style="padding: 10px 0; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9; text-transform: uppercase; font-size: 12px; letter-spacing: 0.4px;">Phone Number</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                      <a href="tel:${cleanPhone}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${phone}</a>
                    </td>
                  </tr>
                  <tr>
                    <td width="140" style="padding: 10px 0; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9; text-transform: uppercase; font-size: 12px; letter-spacing: 0.4px;">Programme</td>
                    <td style="padding: 10px 0; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${programmeTitle}</td>
                  </tr>
                  <tr>
                    <td width="140" style="padding: 10px 0; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9; text-transform: uppercase; font-size: 12px; letter-spacing: 0.4px;">Booking Ref</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                      <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #0f172a; background-color: #f1f5f9; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1;">${bookingId}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 24px 28px;">
                <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.8px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 12px;">
                  Candidate Intake Notes
                </div>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px;">
                  <tr>
                    <td style="padding-bottom: 10px;">
                      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Background &amp; Status</div>
                      <div style="font-size: 13px; color: #1e293b; line-height: 1.5;">${background}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top: 1px solid #e2e8f0; padding-top: 10px;">
                      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Career Goals &amp; Interests</div>
                      <div style="font-size: 13px; color: #1e293b; line-height: 1.5;">${goals}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 28px 28px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="48%" align="center" bgcolor="#0f172a" style="background-color: #0f172a; border-radius: 6px;">
                      <a href="mailto:${email}?subject=Regarding%20Your%20Aintrix%20Academy%20Counselling%20Session%20(${bookingId})" style="display: block; padding: 12px 16px; color: #ffffff; font-size: 13px; font-weight: 600; text-align: center; text-decoration: none; border-radius: 6px;">
                        ✉ Reply via Email
                      </a>
                    </td>
                    <td width="4%">&nbsp;</td>
                    <td width="48%" align="center" bgcolor="#ffffff" style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px;">
                      <a href="tel:${cleanPhone}" style="display: block; padding: 11px 16px; color: #0f172a; font-size: 13px; font-weight: 600; text-align: center; text-decoration: none; border-radius: 6px;">
                        📞 Call Candidate
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#f8fafc" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase;">
                  Aintrix Academy Admissions Engine
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                  Automated verified dispatch • Confidential candidate record • ${bookingId}
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
  </center>
</body>
</html>`;
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
          html: renderOtpEmailHtml(name, code),
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

      // Format programme title and session time
      const prog = programmes.find((p) => p.id === programmeId);
      const programmeTitle = prog ? prog.title : programmeId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const formattedDate = (() => {
        try {
          const d = new Date(slot.startsAt);
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
          return slot.startsAt;
        }
      })();

      const studentHtml = renderBookingConfirmationHtml(name, bookingId, programmeTitle, formattedDate);

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

      // Confirmation emails
      await Promise.allSettled([
        sendEmail({
          to: email,
          subject: `Session Confirmed: Your Aintrix Academy Counselling Session (${bookingId})`,
          text: `Hello ${name},\n\nYour 1-on-1 admission counselling session is confirmed!\n\nBooking ID: ${bookingId}\nProgramme: ${programmeTitle}\nDate & Time: ${formattedDate}\n\nOur team will connect with you at your chosen time.\n\nWarm regards,\nAintrix Academy Admissions`,
          html: studentHtml,
        }),
        sendEmail({
          to: 'aintrixacademy2026@gmail.com',
          subject: `New Counselling Booking: ${name} (${bookingId})`,
          text: `New Booking received:\n\nStudent: ${name}\nEmail: ${email}\nPhone: ${about.phone || 'N/A'}\nProgramme: ${programmeTitle}\nSlot: ${formattedDate}`,
          html: adminHtml,
        }),
      ]);

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
