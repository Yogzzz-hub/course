import type { AboutYou, BookingReceipt, EmailChallenge, PreSessionBrief, Programme, SlotHold, VerifiedEmail } from '../src/components/public-booking/types';

export const bookingProgramme: Programme = {
  id: 'python-full-stack', title: 'Python Full-Stack Engineering', summary: 'Learn Python, interfaces, databases and deployment.', duration: '7 months', currency: 'INR', technologies: ['Python', 'React'], feeDisclosure: 'Test catalogue. Taxes included; package terms apply.',
  packages: [
    { id: 'standard', name: 'Standard', priceMinor: 5999900, inclusions: [{ label: 'Projects', included: true }, { label: 'Mentorship', included: false }] },
    { id: 'premium', name: 'Premium', priceMinor: 7999900, inclusions: [{ label: 'Projects', included: true }, { label: 'Mentorship', included: true }] },
  ], addons: [{ id: 'review', title: 'Portfolio review', priceMinor: 250000 }],
};
export const bookingAbout: AboutYou = { name: 'Test Learner', email: 'learner@example.test', phone: '+91 98765 43210', currentStatus: 'student', programmeId: 'python-full-stack', packageId: 'standard', addonIds: [] };
export const bookingBrief: PreSessionBrief = { background: 'beginner', goals: 'Build useful full-stack applications.', weeklyHours: '12', preferredStartDate: '2026-12-01' };
export const bookingChallenge: EmailChallenge = { challengeId: 'challenge-test', serverNow: '2026-10-12T10:00:00Z', expiresAt: '2026-10-12T10:05:00Z', resendAt: '2026-10-12T10:01:00Z' };
export const bookingVerification: VerifiedEmail = { verificationToken: 'verification-test', serverNow: '2026-10-12T10:00:00Z', expiresAt: '2026-10-12T11:00:00Z' };
export const bookingHold: SlotHold = { holdId: 'hold-test', serverNow: '2026-10-12T10:00:00Z', expiresAt: '2026-10-12T10:10:00Z', slot: { id: 'slot-test', startsAt: '2026-11-10T10:00:00Z', endsAt: '2026-11-10T10:30:00Z' } };
export const bookingReceipt: BookingReceipt = { bookingId: 'booking-test', programmeId: 'python-full-stack', email: bookingAbout.email, slot: bookingHold.slot };
