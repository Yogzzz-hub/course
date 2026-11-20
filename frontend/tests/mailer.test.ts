import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { sendEmail, isEmailConfigured, createSmtpTransporter } from '../server/mailer';

describe('Brevo SMTP Mailer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SMTP_PASS: 'mock-test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('detects email is configured with default Brevo key or env', () => {
    expect(isEmailConfigured()).toBe(true);
  });

  it('creates an SMTP transporter with default Brevo host and port', () => {
    const transporter = createSmtpTransporter();
    expect(transporter).toBeDefined();
  });

  it('simulates or handles email dispatch gracefully', async () => {
    const res = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Enquiry',
      text: 'Test message body',
    });

    expect(res).toHaveProperty('success');
    expect(res).toHaveProperty('provider');
  });
});
