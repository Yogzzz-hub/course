import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { BookingApiError } from './api';
import { initialJourneyState, journeyReducer, type BusyOperation } from './state';
import type { AboutYou, BookingApi, BookingReceipt, BookingSubmission, Programme, Slot, SlotHold } from './types';
import { dateKey, validateAbout, validateBrief } from './validation';

/** Anchor the countdown to server time; renders never determine hold ownership. */
export function useDeadline(deadline?: string, serverNow?: string): number {
  const key = `${deadline ?? ''}|${serverNow ?? ''}`;
  const initialSeconds = deadline && serverNow ? Math.max(0, Math.ceil((Date.parse(deadline) - Date.parse(serverNow)) / 1000)) : 0;
  const [clock, setClock] = useState({ key, seconds: initialSeconds });
  useEffect(() => {
    if (!deadline || !serverNow) { setClock({ key, seconds: 0 }); return; }
    const anchor = performance.now();
    const initial = Date.parse(deadline) - Date.parse(serverNow);
    const update = () => setClock({ key, seconds: Math.max(0, Math.ceil((initial - (performance.now() - anchor)) / 1000)) });
    update();
    const timer = window.setInterval(update, 500);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [deadline, serverNow, key]);
  return clock.key === key ? clock.seconds : initialSeconds;
}

function focusInvalid(errors: Record<string, string | undefined>) {
  const field = Object.keys(errors)[0];
  requestAnimationFrame(() => document.getElementById(`booking-${field}`)?.focus());
}
function readableError(error: unknown): string {
  if (error instanceof BookingApiError) return error.message;
  if (error instanceof Error && error.name === 'TimeoutError') return 'The service took too long to respond. Please try again.';
  return 'We could not reach the service. Check your connection and try again.';
}
function matchesReceipt(receipt: BookingReceipt, submission: BookingSubmission, hold: SlotHold): boolean {
  return receipt.programmeId === submission.about.programmeId && receipt.email.toLowerCase() === submission.about.email.toLowerCase() && receipt.slot.id === hold.slot.id && receipt.slot.startsAt === hold.slot.startsAt && receipt.slot.endsAt === hold.slot.endsAt;
}

export function useBookingJourney(api: BookingApi, programmes: Programme[], timeZone: string) {
  const [state, dispatch] = useReducer(journeyReducer, initialJourneyState);
  const latest = useRef(state);
  latest.current = state;
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const otpAttempt = useRef<{ fingerprint: string; id: string } | null>(null);
  const holdAttempt = useRef<{ slotId: string; id: string } | null>(null);
  const bookingAttempt = useRef<{ fingerprint: string; submission: BookingSubmission } | null>(null);
  const [reload, setReload] = useState(0);
  const [availability, setAvailability] = useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; slots: Slot[]; error: string }>({ status: 'idle', slots: [], error: '' });
  const holdSeconds = useDeadline(state.hold?.expiresAt, state.hold?.serverNow);
  const verificationSeconds = useDeadline(state.verification?.expiresAt, state.verification?.serverNow);
  const challengeSeconds = useDeadline(state.challenge?.expiresAt, state.challenge?.serverNow);
  const resendSeconds = useDeadline(state.challenge?.resendAt, state.challenge?.serverNow);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
      const current = latest.current;
      if (current.hold && current.verification && !current.pendingSubmission) {
        void api.releaseHold(current.hold.holdId, current.verification.verificationToken, AbortSignal.timeout(5000)).catch(() => {});
      }
    };
  }, [api]);

  const verificationToken = state.verification?.verificationToken;
  const programmeId = state.about.programmeId;
  const needsSlots = state.step === 'slots';
  useEffect(() => {
    if (!verificationToken || !programmeId || !needsSlots) return;
    const controller = new AbortController();
    setAvailability({ status: 'loading', slots: [], error: '' });
    api.getSlots(programmeId, verificationToken, controller.signal).then(slots => {
      if (!controller.signal.aborted) setAvailability({ status: 'ready', slots, error: '' });
    }).catch(error => {
      if (controller.signal.aborted) return;
      setAvailability({ status: 'error', slots: [], error: readableError(error) });
      if (error instanceof BookingApiError && error.status === 401) dispatch({ type: 'REVERIFY', message: error.message });
    });
    return () => controller.abort();
  }, [api, verificationToken, programmeId, needsSlots, reload]);

  useEffect(() => {
    if (state.hold && holdSeconds === 0 && !state.pendingSubmission && state.busy !== 'confirm') dispatch({ type: 'EXPIRED', message: 'Your temporary hold expired. Please choose a time again.' });
  }, [state.hold, state.pendingSubmission, state.busy, holdSeconds]);
  useEffect(() => {
    if (state.verification && verificationSeconds === 0 && !state.pendingSubmission && !state.busy) dispatch({ type: 'REVERIFY', message: 'Your email verification expired. Please verify again.' });
  }, [state.verification, verificationSeconds, state.pendingSubmission, state.busy]);

  function begin(operation: BusyOperation): AbortController | null {
    if (active.current) return null;
    const controller = new AbortController();
    active.current = controller;
    dispatch({ type: 'START', operation });
    return controller;
  }
  function finish(controller: AbortController) {
    if (active.current === controller) {
      active.current = null;
      if (mounted.current) dispatch({ type: 'IDLE' });
    }
  }
  function current(controller: AbortController) { return mounted.current && active.current === controller && !controller.signal.aborted; }
  function release(hold = state.hold, token = state.verification?.verificationToken) {
    if (hold && token) void api.releaseHold(hold.holdId, token, AbortSignal.timeout(5000)).catch(() => {});
  }
  function handleFailure(error: unknown) {
    if (error instanceof BookingApiError && error.status === 401) {
      release();
      dispatch({ type: 'REVERIFY', message: error.message });
    } else dispatch({ type: 'ERROR', message: readableError(error) });
  }

  async function sendCode() {
    if (!['about', 'verify'].includes(state.step) || (state.step === 'verify' && resendSeconds > 0)) return;
    const errors = validateAbout(state.about, programmes);
    if (Object.keys(errors).length) { dispatch({ type: 'INVALID', errors }); focusInvalid(errors); return; }
    const about = { ...state.about, name: state.about.name.trim(), email: state.about.email.trim(), phone: state.about.phone.trim() };
    const controller = begin('send-code');
    if (!controller) return;
    const fingerprint = JSON.stringify(about);
    if (otpAttempt.current?.fingerprint !== fingerprint) otpAttempt.current = { fingerprint, id: crypto.randomUUID() };
    try {
      const challenge = await api.sendOtp(about, otpAttempt.current.id, controller.signal);
      if (current(controller)) { otpAttempt.current = null; dispatch({ type: 'CODE_SENT', about, challenge }); }
    } catch (error) { if (current(controller)) handleFailure(error); }
    finally { finish(controller); }
  }

  async function verifyCode(code: string) {
    if (state.step !== 'verify' || !state.challenge) return;
    if (!/^\d{6}$/.test(code)) { dispatch({ type: 'ERROR', message: 'Enter the six-digit code from your email.' }); return; }
    if (!challengeSeconds) { dispatch({ type: 'ERROR', message: 'This code expired. Request a new code.' }); return; }
    const controller = begin('verify');
    if (!controller) return;
    try {
      const verification = await api.verifyOtp(state.challenge.challengeId, code, controller.signal);
      if (current(controller)) dispatch({ type: 'VERIFIED', verification });
    } catch (error) {
      if (current(controller)) dispatch({ type: 'ERROR', message: error instanceof BookingApiError && error.status === 400 ? 'The code is invalid or expired. Try again or request a new code.' : readableError(error) });
    } finally { finish(controller); }
  }

  async function holdSlot(slotId: string) {
    if (state.step !== 'slots' || !state.verification || !verificationSeconds || !availability.slots.some(slot => slot.id === slotId)) return;
    const controller = begin('hold');
    if (!controller) return;
    if (holdAttempt.current?.slotId !== slotId) holdAttempt.current = { slotId, id: crypto.randomUUID() };
    try {
      const hold = await api.holdSlot(slotId, programmeId, state.verification.verificationToken, holdAttempt.current.id, controller.signal);
      if (hold.slot.id !== slotId) { release(hold); throw new BookingApiError('The slot could not be verified. Please choose again.', 502); }
      if (current(controller)) { holdAttempt.current = null; dispatch({ type: 'HELD', hold }); }
      else release(hold);
    } catch (error) {
      if (current(controller)) {
        if (error instanceof BookingApiError && error.status === 409) { holdAttempt.current = null; setReload(value => value + 1); }
        handleFailure(error);
      }
    } finally { finish(controller); }
  }

  async function confirmBooking() {
    if (state.step !== 'brief' || !state.hold || !state.verification || state.pendingSubmission) return;
    if (!holdSeconds) { dispatch({ type: 'EXPIRED', message: 'Your hold expired. Please choose another time.' }); return; }
    const errors = validateBrief(state.brief, dateKey(new Date(), timeZone));
    if (Object.keys(errors).length) { dispatch({ type: 'INVALID', errors }); focusInvalid(errors); return; }
    const controller = begin('confirm');
    if (!controller) return;
    const payload = { holdId: state.hold.holdId, verificationToken: state.verification.verificationToken, about: { ...state.about, addonIds: [...state.about.addonIds] }, brief: { ...state.brief, goals: state.brief.goals.trim() }, timeZone };
    const fingerprint = JSON.stringify(payload);
    if (bookingAttempt.current?.fingerprint !== fingerprint) bookingAttempt.current = { fingerprint, submission: { ...payload, requestId: crypto.randomUUID() } };
    const submission = bookingAttempt.current.submission;
    dispatch({ type: 'CONFIRMING', submission });
    try {
      const receipt = await api.confirmBooking(submission, controller.signal);
      if (!matchesReceipt(receipt, submission, state.hold)) throw new BookingApiError('The confirmation did not match your request.', 502);
      if (current(controller)) dispatch({ type: 'CONFIRMED', receipt });
    } catch (error) {
      if (!current(controller)) return;
      // Network errors and server errors may occur after the server commits a booking.
      if (error instanceof BookingApiError && [400, 401, 403, 409, 410, 422, 429].includes(error.status)) {
        dispatch({ type: 'NOT_BOOKED' });
        if (error.status === 409 || error.status === 410) dispatch({ type: 'EXPIRED', message: 'The hold is no longer available. Please choose another time.' });
        else handleFailure(error);
      } else dispatch({ type: 'ERROR', message: 'We could not confirm the result. Check booking status before making another booking.' });
    } finally { finish(controller); }
  }

  async function checkBookingStatus() {
    const submission = state.pendingSubmission;
    if (!submission || !state.hold) return;
    const controller = begin('status');
    if (!controller) return;
    try {
      const result = await api.getBookingStatus(submission.requestId, submission.verificationToken, controller.signal);
      if (!current(controller)) return;
      if (result.status === 'confirmed') {
        if (!matchesReceipt(result.booking, submission, state.hold)) throw new BookingApiError('The confirmation did not match your request.', 502);
        dispatch({ type: 'CONFIRMED', receipt: result.booking });
      } else if (result.status === 'not-found') {
        dispatch({ type: 'NOT_BOOKED' });
        if (!holdSeconds) dispatch({ type: 'EXPIRED', message: 'No booking was made and your hold expired. Choose a time again.' });
        else dispatch({ type: 'ERROR', message: 'No booking was made. You can retry confirmation while the hold is active.' });
      } else dispatch({ type: 'ERROR', message: 'Your booking is still processing. Please check its status again shortly.' });
    } catch (error) { if (current(controller)) dispatch({ type: 'ERROR', message: readableError(error) }); }
    finally { finish(controller); }
  }

  function back() {
    if (state.busy || state.pendingSubmission) return;
    release();
    otpAttempt.current = null;
    holdAttempt.current = null;
    dispatch({ type: 'BACK' });
  }
  const selectProgramme = useCallback((patch: Partial<AboutYou>) => { dispatch({ type: 'ABOUT_CHANGED', patch }); }, []);

  return { state, availability, holdSeconds, challengeSeconds, resendSeconds, sendCode, verifyCode, holdSlot, confirmBooking, checkBookingStatus, back,
    updateAbout: selectProgramme,
    updateBrief: (patch: Partial<typeof state.brief>) => dispatch({ type: 'BRIEF_CHANGED', patch }),
    refreshSlots: () => setReload(value => value + 1),
    reset: () => { if (!state.busy && !state.pendingSubmission) { bookingAttempt.current = null; dispatch({ type: 'RESET' }); } },
  };
}
export type BookingJourneyController = ReturnType<typeof useBookingJourney>;
