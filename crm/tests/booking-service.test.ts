import { describe, it, expect } from 'vitest';
import { generateSlots, requestBookingOtp, verifyBookingOtp, confirmBooking } from '@/backend/services/booking';
import { formatSessionDate, renderBookingConfirmationHtml, renderAdminBookingNotificationHtml } from '@/backend/services/brevo-mail';

describe('Unified Booking Engine & Brevo Email Service', () => {
  it('generates available slot intervals for upcoming days', () => {
    const slots = generateSlots(5);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty('id');
    expect(slots[0]).toHaveProperty('startsAt');
    expect(slots[0]).toHaveProperty('endsAt');
    expect(slots[0].available).toBe(true);
  });

  it('formats dates cleanly in Indian Standard Time (IST)', () => {
    const sampleDate = '2026-10-25T14:00:00.000Z';
    const formatted = formatSessionDate(sampleDate);
    expect(formatted).toContain('IST');
    expect(formatted).toContain('October');
  });

  it('renders executive candidate confirmation email with responsive styling', () => {
    const html = renderBookingConfirmationHtml(
      'Aravind Baskar',
      'BK-TEST-123',
      'Python Full Stack Engineering',
      'Monday, October 26, 2026, 02:30 PM IST'
    );
    expect(html).toContain('Aravind Baskar');
    expect(html).toContain('BK-TEST-123');
    expect(html).toContain('Python Full Stack Engineering');
    expect(html).toContain('Apex Global Academy');
  });

  it('renders admissions admin notification with candidate details and action buttons', () => {
    const html = renderAdminBookingNotificationHtml({
      bookingId: 'BK-ADM-456',
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '+91 98765 43210',
      programmeTitle: 'Full Stack Web & Mobile App Development',
      formattedDate: 'Tuesday, October 27, 2026, 04:30 PM IST',
      background: 'Final-year engineering student',
      goals: 'Transition to full-stack developer at a high-growth tech startup',
    });
    expect(html).toContain('Priya Sharma');
    expect(html).toContain('priya@example.com');
    expect(html).toContain('+91 98765 43210');
    expect(html).toContain('BK-ADM-456');
    expect(html).toContain('Final-year engineering student');
    expect(html).toContain('Transition to full-stack developer');
  });

  it('handles OTP request and verification flow seamlessly', async () => {
    const testEmail = 'candidate-test@apexacademy.edu';
    const about = {
      fullName: 'Test Candidate',
      email: testEmail,
      phone: '+91 99999 88888',
    };

    const reqRes = await requestBookingOtp(testEmail, about);
    expect(reqRes.success).toBe(true);

    // Invalid code check
    const invalidCheck = verifyBookingOtp(testEmail, '000000');
    expect(invalidCheck.verified).toBe(false);
  });

  it('finalizes a booking session with unique ID generation and notification dispatch', async () => {
    const slot = generateSlots(1)[0];
    const about = {
      fullName: 'Karthik Raja',
      email: 'karthik@apexacademy.edu',
      phone: '+91 91234 56789',
    };
    const brief = {
      background: 'Software QA Engineer with 2 years experience',
      goals: 'Upskill to backend architecture & systems programming',
    };

    const result = await confirmBooking({
      programmeId: 'python-full-stack',
      programmeTitle: 'Python Full Stack Engineering',
      slot,
      about,
      brief,
    });

    expect(result.success).toBe(true);
    expect(result.bookingId).toMatch(/^BK-[A-Z0-9]+-\d+$/);
  });
});
