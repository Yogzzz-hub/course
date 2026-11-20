export type CurrentStatus = 'student' | 'graduate' | 'employed' | 'career-change';
export type BackgroundLevel = 'beginner' | 'some-experience' | 'experienced';

export interface ProgrammePackage {
  id: string;
  name: string;
  /** Integer minor units: paise for INR, cents for USD. */
  priceMinor: number;
  inclusions: { label: string; included: boolean }[];
}

export interface Programme {
  id: string;
  title: string;
  summary: string;
  duration: string;
  currency: string;
  technologies: string[];
  feeDisclosure: string;
  packages: ProgrammePackage[];
  addons: { id: string; title: string; priceMinor: number }[];
}

export interface AboutYou {
  name: string;
  email: string;
  phone: string;
  currentStatus: CurrentStatus | '';
  programmeId: string;
  packageId: string;
  addonIds: string[];
}

export interface PreSessionBrief {
  background: BackgroundLevel | '';
  goals: string;
  weeklyHours: string;
  preferredStartDate: string;
}

export interface ServerClock { serverNow: string }
export interface EmailChallenge extends ServerClock {
  challengeId: string;
  expiresAt: string;
  resendAt: string;
}
export interface VerifiedEmail extends ServerClock {
  verificationToken: string;
  expiresAt: string;
}
export interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
}
export interface SlotHold extends ServerClock {
  holdId: string;
  expiresAt: string;
  slot: Slot;
}
export interface BookingReceipt {
  bookingId: string;
  programmeId: string;
  email: string;
  slot: Slot;
}
export interface BookingSubmission {
  requestId: string;
  verificationToken: string;
  holdId: string;
  about: AboutYou;
  brief: PreSessionBrief;
  timeZone: string;
}
export type BookingStatus =
  | { status: 'confirmed'; booking: BookingReceipt }
  | { status: 'pending' }
  | { status: 'not-found' };

/** Implement with your CMS and server. Tokens remain in memory and never enter URLs. */
export interface BookingApi {
  getProgrammes(signal: AbortSignal): Promise<Programme[]>;
  sendOtp(about: AboutYou, requestId: string, signal: AbortSignal): Promise<EmailChallenge>;
  verifyOtp(challengeId: string, code: string, signal: AbortSignal): Promise<VerifiedEmail>;
  getSlots(programmeId: string, verificationToken: string, signal: AbortSignal): Promise<Slot[]>;
  holdSlot(slotId: string, programmeId: string, verificationToken: string, requestId: string, signal: AbortSignal): Promise<SlotHold>;
  releaseHold(holdId: string, verificationToken: string, signal: AbortSignal): Promise<void>;
  confirmBooking(submission: BookingSubmission, signal: AbortSignal): Promise<BookingReceipt>;
  getBookingStatus(requestId: string, verificationToken: string, signal: AbortSignal): Promise<BookingStatus>;
}
