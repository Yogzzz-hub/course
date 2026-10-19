import { academy } from '../config/academy';

export const RECEIVER_EMAIL = academy.receiverEmail || 'aintrixacademy2026@gmail.com';

export interface EnrolmentNotification {
  type: 'enrolment';
  studentName: string;
  studentEmail: string;
  phone?: string;
  programme: string;
  package: string;
  amount: string;
  billingAddress: string;
  orderId: string;
  timestamp?: string;
}

export interface ConsultationNotification {
  type: 'consultation';
  studentName: string;
  studentEmail: string;
  phone?: string;
  programme?: string;
  preferredDate?: string;
  preferredTime?: string;
  topics?: string;
  message?: string;
  timestamp?: string;
}

export type StudentNotificationPayload = EnrolmentNotification | ConsultationNotification;

export interface NotificationResult {
  success: boolean;
  receiver: string;
  mailtoUrl: string;
  message: string;
  referenceId: string;
  deliveredViaApi: boolean;
}

export function buildMailtoUrl(payload: StudentNotificationPayload): string {
  const isEnrolment = payload.type === 'enrolment';
  const subject = isEnrolment
    ? `[Aintrix Academy] Enrolment Notification - ${payload.studentName} (${payload.programme})`
    : `[Aintrix Academy] Consultation Enquiry via Mail - ${payload.studentName}`;

  let body = '';
  if (isEnrolment) {
    body = [
      `AINTRIX ACADEMY - STUDENT ENROLMENT NOTIFICATION`,
      `--------------------------------------------------`,
      `Student Name: ${payload.studentName}`,
      `Email Address: ${payload.studentEmail}`,
      payload.phone ? `Phone: ${payload.phone}` : null,
      `Programme: ${payload.programme}`,
      `Selected Package: ${payload.package}`,
      `Amount Paid / Due: ${payload.amount}`,
      `Order Reference: ${payload.orderId}`,
      `Billing Address: ${payload.billingAddress}`,
      `Date & Time: ${payload.timestamp || new Date().toLocaleString()}`,
      `--------------------------------------------------`,
      `Sent to admissions receiver: ${RECEIVER_EMAIL}`,
    ].filter(Boolean).join('\n');
  } else {
    body = [
      `AINTRIX ACADEMY - CONSULTATION ENQUIRY`,
      `--------------------------------------------------`,
      `Student Name: ${payload.studentName}`,
      `Student Email: ${payload.studentEmail}`,
      payload.phone ? `Phone Number: ${payload.phone}` : null,
      payload.programme ? `Programme of Interest: ${payload.programme}` : null,
      payload.preferredDate ? `Preferred Date: ${payload.preferredDate}` : null,
      payload.preferredTime ? `Preferred Time: ${payload.preferredTime}` : null,
      payload.topics ? `Discussion Topic: ${payload.topics}` : null,
      payload.message ? `Message / Questions:\n${payload.message}` : null,
      `Date & Time: ${payload.timestamp || new Date().toLocaleString()}`,
      `--------------------------------------------------`,
      `Receiver Email: ${RECEIVER_EMAIL}`,
    ].filter(Boolean).join('\n');
  }

  return `mailto:${RECEIVER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function sendStudentNotification(
  payload: StudentNotificationPayload,
  signal?: AbortSignal,
): Promise<NotificationResult> {
  const timestamp = payload.timestamp || new Date().toISOString();
  const fullPayload = { ...payload, timestamp, receiver: RECEIVER_EMAIL };
  const referenceId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const mailtoUrl = buildMailtoUrl(fullPayload);

  let deliveredViaApi = false;
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fullPayload, referenceId }),
      signal: signal || AbortSignal.timeout(5000),
    });
    if (res.ok) {
      deliveredViaApi = true;
    }
  } catch {
    // API not configured in offline/preview or static deployment; graceful fallback
    deliveredViaApi = false;
  }

  try {
    const logKey = 'aintrix_sent_notifications';
    const existing = JSON.parse(localStorage.getItem(logKey) || '[]');
    existing.unshift({ ...fullPayload, referenceId, deliveredViaApi, sentAt: new Date().toISOString() });
    localStorage.setItem(logKey, JSON.stringify(existing.slice(0, 50)));
  } catch {
    // Local storage disabled or error
  }

  return {
    success: true,
    receiver: RECEIVER_EMAIL,
    mailtoUrl,
    referenceId,
    deliveredViaApi,
    message: payload.type === 'enrolment'
      ? `Enrolment notification logged for receiver mail (${RECEIVER_EMAIL}).`
      : `Consultation enquiry prepared for receiver mail (${RECEIVER_EMAIL}).`,
  };
}
