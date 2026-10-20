import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "./prisma";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const from = process.env.SMTP_FROM || `"Apex Global Academy" <${user}>`;

  return { host, port, secure, user, pass, from };
}

let cachedTransporter: Transporter | null = null;

function getTransporter(config: SmtpConfig): Transporter {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }
  return cachedTransporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  eventType?: string;
  recipientId?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  status: "SENT" | "DEV_LOGGED" | "FAILED";
  error?: string;
}

/**
 * Dispatches an email via SMTP.
 * If SMTP credentials are not configured, gracefully logs to console and delivery log.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, text, html, eventType = "TRANSACTIONAL_EMAIL", recipientId } = options;
  const config = getSmtpConfig();

  // If SMTP credentials configured, attempt real delivery
  if (config) {
    try {
      const transporter = getTransporter(config);
      const info = await transporter.sendMail({
        from: config.from,
        to,
        subject,
        text,
        html,
      });

      // Record in notification delivery log
      await prisma.notificationDeliveryLog.create({
        data: {
          recipientId: recipientId || null,
          recipientContact: to,
          channel: "EMAIL",
          eventType,
          renderedSubject: subject,
          renderedBody: text,
          status: "SENT",
          provider: `SMTP (${config.host})`,
          providerMessageId: info.messageId,
        },
      }).catch(() => {});

      return {
        success: true,
        messageId: info.messageId,
        status: "SENT",
      };
    } catch (err: any) {
      console.error("[SMTP ERROR] Failed to send email via SMTP:", err.message);

      await prisma.notificationDeliveryLog.create({
        data: {
          recipientId: recipientId || null,
          recipientContact: to,
          channel: "EMAIL",
          eventType,
          renderedSubject: subject,
          renderedBody: text,
          status: "FAILED",
          provider: `SMTP (${config.host})`,
          errorMessage: err.message,
        },
      }).catch(() => {});

      return {
        success: false,
        status: "FAILED",
        error: err.message,
      };
    }
  }

  // Fallback: SMTP credentials not set (Development / Local mode)
  const mockMessageId = `smtp-dev-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  console.log(`\n======================================================`);
  console.log(`[SMTP DEV EMAIL DISPATCH]`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`MessageId: ${mockMessageId}`);
  console.log(`======================================================\n`);

  await prisma.notificationDeliveryLog.create({
    data: {
      recipientId: recipientId || null,
      recipientContact: to,
      channel: "EMAIL",
      eventType,
      renderedSubject: subject,
      renderedBody: text,
      status: "SENT",
      provider: "SMTP_DEV_MODE",
      providerMessageId: mockMessageId,
    },
  }).catch(() => {});

  return {
    success: true,
    messageId: mockMessageId,
    status: "DEV_LOGGED",
  };
}

/**
 * Sends a Student One-Time Verification Password (OTP) via SMTP Email.
 */
export async function sendStudentOtpEmail(
  toEmail: string,
  studentName: string,
  otpCode: string,
  recipientId?: string
): Promise<SendEmailResult> {
  const subject = `Your Apex Academy Verification Code: ${otpCode}`;

  const text = `Hello ${studentName || "Student"},\n\n` +
    `Your one-time login verification code for the Apex Academy Student Portal is:\n\n` +
    `   ${otpCode}\n\n` +
    `This code will expire in 10 minutes.\n\n` +
    `If you did not request this login code, please ignore this email or contact support immediately.\n\n` +
    `Best regards,\nApex Global Academy Security Team`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFFBF5; margin: 0; padding: 24px; color: #2A0F16;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid rgba(42, 15, 22, 0.08); overflow: hidden; box-shadow: 0 4px 12px rgba(42, 15, 22, 0.05);">
    <!-- Brand Header -->
    <div style="background-color: #6D1A2B; padding: 24px 32px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: 0.5px;">
        APEX GLOBAL ACADEMY
      </h1>
      <p style="color: #F6EBCF; font-size: 11px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px;">
        Student Operations Portal
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <h2 style="font-size: 18px; font-weight: 700; color: #2A0F16; margin-top: 0; margin-bottom: 12px;">
        Sign In Verification Code
      </h2>
      <p style="font-size: 14px; line-height: 1.5; color: #57534E; margin: 0 0 24px;">
        Hello ${studentName || "Student"}, please use the one-time verification password below to authenticate into your Student Learning & Financial Portal.
      </p>

      <!-- OTP Code Box -->
      <div style="background: #FDF9F0; border: 2px dashed #C9A24B; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: monospace, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #6D1A2B;">
          ${otpCode}
        </span>
        <p style="font-size: 11px; color: #78716C; margin: 8px 0 0; font-weight: 600;">
          EXPIRES IN 10 MINUTES
        </p>
      </div>

      <p style="font-size: 12px; line-height: 1.6; color: #78716C; margin: 0 0 16px;">
        <strong>Security Notice:</strong> Never share this verification code with anyone. Apex Academy staff will never ask for your verification code.
      </p>

      <p style="font-size: 12px; line-height: 1.6; color: #A8A29E; margin: 0;">
        If you did not request this email, no further action is required. Your account remains secure.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #FAF6F0; padding: 16px 32px; border-top: 1px solid rgba(42, 15, 22, 0.06); text-align: center;">
      <p style="font-size: 11px; color: #A8A29E; margin: 0;">
        &copy; ${new Date().getFullYear()} Apex Global Academy. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    text,
    html,
    eventType: "STUDENT_EMAIL_OTP",
    recipientId,
  });
}
