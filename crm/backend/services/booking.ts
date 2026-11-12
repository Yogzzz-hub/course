import { prisma } from '../../db/prisma';
import { sendEmail, renderBookingConfirmationHtml, renderAdminBookingNotificationHtml, formatSessionDate } from './brevo-mail';

export interface BookingSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
}

export interface CandidateBrief {
  background: string;
  goals: string;
  experienceLevel?: string;
  timeCommitment?: string;
}

export interface CandidateAbout {
  fullName: string;
  email: string;
  phone: string;
}

// In-memory OTP and slot holds
const otpStore = new Map<string, { code: string; email: string; about: CandidateAbout; expiresAt: number }>();
const holdStore = new Map<string, { slotId: string; startsAt: string; endsAt: string; programmeId: string; expiresAt: number }>();

export function generateSlots(daysAhead = 7): BookingSlot[] {
  const slots: BookingSlot[] = [];
  const now = new Date();

  for (let day = 1; day <= daysAhead; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);

    // Skip Sundays
    if (date.getDay() === 0) continue;

    // Slots at 10:00, 14:00, 16:30, 19:00 IST
    const times = [
      { h: 10, m: 0 },
      { h: 14, m: 0 },
      { h: 16, m: 30 },
      { h: 19, m: 0 },
    ];

    for (const time of times) {
      const start = new Date(date);
      start.setHours(time.h, time.m, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 45);

      const id = `slot-${start.getTime()}`;
      slots.push({
        id,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        available: !holdStore.has(id),
      });
    }
  }

  return slots;
}

export async function requestBookingOtp(email: string, about: CandidateAbout): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(normalizedEmail, {
    code,
    email: normalizedEmail,
    about,
    expiresAt,
  });

  const subject = `Your Apex Academy Verification Code: ${code}`;
  const text = `Your 1-on-1 strategy session verification code is ${code}. This code is valid for 10 minutes.`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #0f172a; margin-top: 0;">Apex Global Academy Verification</h2>
      <p style="color: #475569; font-size: 15px;">Your verification code to confirm your counselling session is:</p>
      <div style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #0284c7; background: #f0f9ff; padding: 14px 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        ${code}
      </div>
      <p style="color: #64748b; font-size: 13px;">This code expires in 10 minutes. If you did not request this session, please disregard this email.</p>
    </div>
  `;

  const emailRes = await sendEmail({
    to: normalizedEmail,
    subject,
    text,
    html,
  });

  return { success: emailRes.success, error: emailRes.error };
}

export function verifyBookingOtp(email: string, code: string): { verified: boolean; error?: string } {
  const normalizedEmail = email.toLowerCase().trim();
  const record = otpStore.get(normalizedEmail);

  if (!record) {
    return { verified: false, error: 'No verification code requested or session expired.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return { verified: false, error: 'Verification code has expired. Please request a new code.' };
  }

  if (record.code !== code.trim()) {
    return { verified: false, error: 'Invalid verification code. Please check your inbox and try again.' };
  }

  // OTP verified successfully
  otpStore.delete(normalizedEmail);
  return { verified: true };
}

export async function confirmBooking(params: {
  programmeId: string;
  programmeTitle?: string;
  slot: { id: string; startsAt: string; endsAt: string };
  about: CandidateAbout;
  brief: CandidateBrief;
}): Promise<{ success: boolean; bookingId: string; error?: string }> {
  const { programmeId, slot, about, brief } = params;
  const bookingId = `BK-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const formattedDate = formatSessionDate(slot.startsAt);
  const programmeTitle = params.programmeTitle || 'Apex Executive Engineering Programme';

  try {
    // 1. Persist Lead & Enquiry in Prisma Database if available
    try {
      await prisma.lead.create({
        data: {
          fullName: about.fullName,
          email: about.email.toLowerCase().trim(),
          phone: about.phone,
          status: 'COUNSELLING_SCHEDULED',
          source: 'Website 1-on-1 Booking Wizard',
          message: `Programme: ${programmeTitle}`,
          notes: `Booking ID: ${bookingId} | Slot: ${formattedDate} | Goals: ${brief.goals} | Experience: ${brief.background}`,
        },
      });
    } catch (dbErr) {
      console.warn('Prisma lead recording fallback:', dbErr);
    }

    // 2. Render and Dispatch Student Confirmation Email (Brevo)
    const confirmationHtml = renderBookingConfirmationHtml(
      about.fullName,
      bookingId,
      programmeTitle,
      formattedDate
    );

    await sendEmail({
      to: about.email,
      subject: `Session Confirmed: ${programmeTitle} — Apex Global Academy (${bookingId})`,
      text: `Your 1-on-1 strategy session for ${programmeTitle} is confirmed for ${formattedDate}. Reference ID: ${bookingId}`,
      html: confirmationHtml,
    });

    // 3. Render and Dispatch Admissions Admin Notification Email
    const adminHtml = renderAdminBookingNotificationHtml({
      bookingId,
      name: about.fullName,
      email: about.email,
      phone: about.phone,
      programmeTitle,
      formattedDate,
      background: brief.background,
      goals: brief.goals,
    });

    const adminEmail = process.env.ADMIN_EMAIL || process.env.ENQUIRY_TO || 'aintrixacademy2026@gmail.com';
    await sendEmail({
      to: adminEmail,
      subject: `[New Lead Booking] ${about.fullName} — ${programmeTitle} (${bookingId})`,
      text: `New booking: ${about.fullName} (${about.email}, ${about.phone}) for ${programmeTitle} at ${formattedDate}. Booking ID: ${bookingId}`,
      html: adminHtml,
    });

    return { success: true, bookingId };
  } catch (err) {
    return { success: false, bookingId, error: String(err) };
  }
}
