import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpBookingApi, parseProgrammes, parseSlot } from '../src/components/public-booking/api';
import { initialJourneyState, journeyReducer, type JourneyState } from '../src/components/public-booking/state';
import { dateKey, feeTotal, formatMoney, groupSlots, validateAbout, validateBrief } from '../src/components/public-booking/validation';
import { bookingAbout, bookingBrief, bookingChallenge, bookingHold, bookingProgramme, bookingReceipt, bookingVerification } from './booking-fixtures';

afterEach(() => vi.unstubAllGlobals());
function heldState(): JourneyState {
  let state = journeyReducer(initialJourneyState, { type: 'CODE_SENT', about: bookingAbout, challenge: bookingChallenge });
  state = journeyReducer(state, { type: 'VERIFIED', verification: bookingVerification });
  return journeyReducer(state, { type: 'HELD', hold: bookingHold });
}
describe('Booking state transitions', () => {
  it('cannot skip verification to hold a slot or confirm a booking', () => {
    expect(journeyReducer(initialJourneyState, { type: 'HELD', hold: bookingHold })).toBe(initialJourneyState);
    expect(journeyReducer(initialJourneyState, { type: 'CONFIRMED', receipt: bookingReceipt })).toBe(initialJourneyState);
  });
  it('returns an expired hold to availability while preserving the brief and verification', () => {
    const state = { ...heldState(), brief: bookingBrief };
    const expired = journeyReducer(state, { type: 'EXPIRED', message: 'Expired' });
    expect(expired.step).toBe('slots'); expect(expired.hold).toBeNull(); expect(expired.brief).toEqual(bookingBrief); expect(expired.verification).toEqual(bookingVerification);
  });
  it('locks edits and slot changes until an ambiguous confirmation is resolved', () => {
    const held = heldState();
    const submission = { requestId: 'request-test', about: bookingAbout, brief: bookingBrief, timeZone: 'Asia/Kolkata', verificationToken: bookingVerification.verificationToken, holdId: bookingHold.holdId };
    const state = journeyReducer(held, { type: 'CONFIRMING', submission });
    expect(journeyReducer(state, { type: 'BRIEF_CHANGED', patch: { goals: 'Changed' } })).toBe(state);
    expect(journeyReducer(state, { type: 'BACK' })).toBe(state);
    expect(journeyReducer(state, { type: 'EXPIRED', message: 'Expired' })).toBe(state);
    expect(journeyReducer(state, { type: 'CONFIRMED', receipt: bookingReceipt }).step).toBe('complete');
  });
  it('changing details requires a fresh email verification', () => {
    const state = journeyReducer(heldState(), { type: 'REVERIFY', message: 'Verify again' });
    const edited = journeyReducer(state, { type: 'ABOUT_CHANGED', patch: { email: 'new@example.test' } });
    expect(edited.verification).toBeNull(); expect(edited.challenge).toBeNull(); expect(edited.hold).toBeNull(); expect(edited.about.email).toBe('new@example.test');
  });
});
describe('Fees, validation and time zones', () => {
  it('adds integer minor-unit fees without counting duplicate selected extras', () => {
    expect(feeTotal(bookingProgramme, 'premium', ['review', 'review'])).toBe(8249900);
    expect(feeTotal(bookingProgramme, 'missing', [])).toBeNull();
    expect(formatMoney(8249900, 'INR')).toBe('₹82,499.00');
    expect(formatMoney(1000, 'JPY')).toContain('1,000');
  });
  it('rejects malformed personal data and unpublished package selections', () => {
    expect(validateAbout(bookingAbout, [bookingProgramme])).toEqual({});
    expect(validateAbout({ ...bookingAbout, phone: '123', email: 'bad', packageId: 'missing' }, [bookingProgramme])).toMatchObject({ email: expect.any(String), phone: expect.any(String), packageId: expect.any(String) });
  });
  it('validates real calendar dates and bounded whole hours', () => {
    expect(validateBrief(bookingBrief, '2026-10-12')).toEqual({});
    expect(validateBrief({ ...bookingBrief, preferredStartDate: '2026-02-30', weeklyHours: '1.5' }, '2026-01-01')).toHaveProperty('preferredStartDate');
    expect(validateBrief({ ...bookingBrief, weeklyHours: 'Infinity' }, '2026-01-01')).toHaveProperty('weeklyHours');
  });
  it('groups UTC slots across local date boundaries and DST', () => {
    expect(dateKey('2026-11-10T00:30:00Z', 'America/Los_Angeles')).toBe('2026-11-09');
    expect(dateKey('2026-11-10T00:30:00Z', 'Asia/Kolkata')).toBe('2026-11-10');
    const slots = [{ ...bookingHold.slot, startsAt: '2026-11-01T05:30:00Z' }, { ...bookingHold.slot, id: 'second', startsAt: '2026-11-01T06:30:00Z' }];
    expect(groupSlots(slots, 'America/New_York').get('2026-11-01')).toHaveLength(2);
  });
});
describe('HTTP boundary', () => {
  it('rejects unsafe CMS fees, duplicate IDs, and ambiguous slot times', () => {
    expect(parseProgrammes([bookingProgramme])).toEqual([bookingProgramme]);
    expect(() => parseProgrammes([bookingProgramme, bookingProgramme])).toThrow();
    expect(() => parseProgrammes([{ ...bookingProgramme, packages: [{ ...bookingProgramme.packages[0], priceMinor: -1 }] }])).toThrow();
    expect(() => parseSlot({ ...bookingHold.slot, startsAt: '2026-11-10T10:00:00' })).toThrow();
    expect(() => parseSlot({ ...bookingHold.slot, endsAt: bookingHold.slot.startsAt })).toThrow();
  });
  it('keeps sensitive values out of URLs and sends an idempotency key', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(bookingChallenge), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetcher);
    const api = createHttpBookingApi();
    await api.sendOtp(bookingAbout, 'request-123', new AbortController().signal);
    expect(fetcher.mock.calls[0][0]).toBe('/api/booking/otp/send');
    expect(fetcher.mock.calls[0][1].headers['Idempotency-Key']).toBe('request-123');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ about: bookingAbout });
  });
  it('handles rate limits and rejects HTML success responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '30' } })).mockResolvedValueOnce(new Response('<html>Fallback</html>', { headers: { 'Content-Type': 'text/html' } })));
    const api = createHttpBookingApi();
    await expect(api.getProgrammes(new AbortController().signal)).rejects.toMatchObject({ status: 429, retryAfterSeconds: 30 });
    await expect(api.getProgrammes(new AbortController().signal)).rejects.toMatchObject({ status: 502 });
  });
});
