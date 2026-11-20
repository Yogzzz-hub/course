import type { AboutYou, BookingReceipt, BookingSubmission, EmailChallenge, PreSessionBrief, SlotHold, VerifiedEmail } from './types';
import type { FieldErrors } from './validation';

export type BookingStep = 'about' | 'verify' | 'slots' | 'brief' | 'complete';
export type BusyOperation = 'send-code' | 'verify' | 'hold' | 'confirm' | 'status';
export interface JourneyState {
  step: BookingStep;
  about: AboutYou;
  brief: PreSessionBrief;
  challenge: EmailChallenge | null;
  verification: VerifiedEmail | null;
  hold: SlotHold | null;
  receipt: BookingReceipt | null;
  /** Retained on ambiguous network failure: check status before another booking. */
  pendingSubmission: BookingSubmission | null;
  busy: BusyOperation | null;
  error: string;
  errors: FieldErrors<AboutYou> & FieldErrors<PreSessionBrief>;
}
export const initialJourneyState: JourneyState = {
  step: 'about', about: { name: '', email: '', phone: '', currentStatus: '', programmeId: '', packageId: '', addonIds: [] },
  brief: { background: '', goals: '', weeklyHours: '', preferredStartDate: '' },
  challenge: null, verification: null, hold: null, receipt: null, pendingSubmission: null, busy: null, error: '', errors: {},
};
export type JourneyAction =
  | { type: 'ABOUT_CHANGED'; patch: Partial<AboutYou> }
  | { type: 'BRIEF_CHANGED'; patch: Partial<PreSessionBrief> }
  | { type: 'START'; operation: BusyOperation }
  | { type: 'IDLE' }
  | { type: 'ERROR'; message: string }
  | { type: 'INVALID'; errors: JourneyState['errors'] }
  | { type: 'CODE_SENT'; about: AboutYou; challenge: EmailChallenge }
  | { type: 'VERIFIED'; verification: VerifiedEmail }
  | { type: 'HELD'; hold: SlotHold }
  | { type: 'EXPIRED'; message: string }
  | { type: 'REVERIFY'; message: string }
  | { type: 'BACK' }
  | { type: 'CONFIRMING'; submission: BookingSubmission }
  | { type: 'NOT_BOOKED' }
  | { type: 'CONFIRMED'; receipt: BookingReceipt }
  | { type: 'RESET' };

export function journeyReducer(state: JourneyState, action: JourneyAction): JourneyState {
  switch (action.type) {
    case 'ABOUT_CHANGED':
      if (state.step !== 'about' || state.busy) return state;
      return { ...state, about: { ...state.about, ...action.patch }, errors: {}, error: '', challenge: null, verification: null };
    case 'BRIEF_CHANGED':
      if (state.step !== 'brief' || state.busy || state.pendingSubmission) return state;
      return { ...state, brief: { ...state.brief, ...action.patch }, errors: {}, error: '' };
    case 'START': return { ...state, busy: action.operation, error: '' };
    case 'IDLE': return { ...state, busy: null };
    case 'ERROR': return { ...state, error: action.message };
    case 'INVALID': return { ...state, errors: action.errors, error: 'Please check the highlighted fields.' };
    case 'CODE_SENT':
      if (state.step !== 'about' && state.step !== 'verify') return state;
      return { ...state, step: 'verify', about: action.about, challenge: action.challenge, verification: null, hold: null, errors: {}, error: '' };
    case 'VERIFIED':
      if (state.step !== 'verify' || !state.challenge) return state;
      return { ...state, step: 'slots', verification: action.verification, challenge: null, error: '' };
    case 'HELD':
      if (state.step !== 'slots' || !state.verification) return state;
      return { ...state, step: 'brief', hold: action.hold, error: '' };
    case 'EXPIRED':
      if (state.pendingSubmission || state.step !== 'brief') return state;
      return { ...state, step: 'slots', hold: null, errors: {}, error: action.message };
    case 'REVERIFY':
      if (state.pendingSubmission || state.step === 'complete') return state;
      return { ...state, step: 'about', verification: null, challenge: null, hold: null, errors: {}, error: action.message };
    case 'BACK':
      if (state.busy || state.pendingSubmission || state.step === 'complete') return state;
      if (state.step === 'brief') return { ...state, step: 'slots', hold: null, errors: {}, error: '' };
      return { ...state, step: 'about', challenge: null, verification: null, hold: null, errors: {}, error: '' };
    case 'CONFIRMING':
      if (state.step !== 'brief' || !state.hold || !state.verification) return state;
      return { ...state, pendingSubmission: action.submission };
    case 'NOT_BOOKED': return { ...state, pendingSubmission: null };
    case 'CONFIRMED':
      if (!state.pendingSubmission) return state;
      return { ...state, step: 'complete', receipt: action.receipt, pendingSubmission: null, hold: null, verification: null, error: '', errors: {} };
    case 'RESET': return { ...initialJourneyState, about: { ...initialJourneyState.about, addonIds: [] }, brief: { ...initialJourneyState.brief } };
  }
}
