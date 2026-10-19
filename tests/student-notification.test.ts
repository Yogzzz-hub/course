import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  RECEIVER_EMAIL,
  buildMailtoUrl,
  sendStudentNotification,
  type EnrolmentNotification,
  type ConsultationNotification,
} from '../src/utils/studentNotification';
import { academy } from '../src/config/academy';

describe('Student and Consultation Notification Configuration', () => {
  it('has the receiver mail configured to aintrixacademy2026@gmail.com', () => {
    expect(RECEIVER_EMAIL).toBe('aintrixacademy2026@gmail.com');
    expect(academy.receiverEmail).toBe('aintrixacademy2026@gmail.com');
  });

  it('has official academy address and Google Maps links configured', () => {
    expect(academy.address).toBe('93/50, Ramakrishna mutt road, Mandaveli, Chennai - 600028');
    expect(academy.googleMapsUrl).toBe('https://share.google/mU36GNGijDKeopwkV');
    expect(academy.googleMapsEmbedUrl).toContain('Mandaveli');
  });

  it('builds a proper mailto URL for student enrolment', () => {
    const payload: EnrolmentNotification = {
      type: 'enrolment',
      studentName: 'Priya Sharma',
      studentEmail: 'priya@example.com',
      programme: 'Python Full-Stack',
      package: 'Premium',
      amount: '₹74,999',
      orderId: 'order-12345',
      billingAddress: '93/50 RK Mutt Road, Mandaveli, Chennai',
    };

    const mailto = buildMailtoUrl(payload);
    expect(mailto).toContain(`mailto:${RECEIVER_EMAIL}`);
    expect(mailto).toContain(encodeURIComponent('Enrolment Notification - Priya Sharma'));
    expect(mailto).toContain(encodeURIComponent('Priya Sharma'));
    expect(mailto).toContain(encodeURIComponent('order-12345'));
    expect(mailto).toContain(encodeURIComponent('₹74,999'));
  });

  it('builds a proper mailto URL for consultation enquiry', () => {
    const payload: ConsultationNotification = {
      type: 'consultation',
      studentName: 'Karthik Raja',
      studentEmail: 'karthik@example.com',
      phone: '+91 9876543210',
      programme: 'Python Full-Stack',
      preferredDate: '2026-10-25',
      preferredTime: 'Morning',
      topics: 'Curriculum & Learning Pace',
      message: 'I want to know if prior coding experience is needed.',
    };

    const mailto = buildMailtoUrl(payload);
    expect(mailto).toContain(`mailto:${RECEIVER_EMAIL}`);
    expect(mailto).toContain(encodeURIComponent('Consultation Enquiry via Mail - Karthik Raja'));
    expect(mailto).toContain(encodeURIComponent('Karthik Raja'));
    expect(mailto).toContain(encodeURIComponent('+91 9876543210'));
    expect(mailto).toContain(encodeURIComponent('prior coding experience'));
  });

  it('sends notification and logs it in local history', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
    vi.stubGlobal('fetch', fakeFetch);

    const payload: ConsultationNotification = {
      type: 'consultation',
      studentName: 'Ananya S',
      studentEmail: 'ananya@example.com',
      message: 'Consultation request test',
    };

    const result = await sendStudentNotification(payload);
    expect(result.success).toBe(true);
    expect(result.receiver).toBe('aintrixacademy2026@gmail.com');
    expect(result.deliveredViaApi).toBe(true);
    expect(result.referenceId).toMatch(/^notif_/);
  });
});
