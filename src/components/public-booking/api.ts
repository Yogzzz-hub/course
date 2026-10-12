import type { AboutYou, BookingApi, BookingReceipt, BookingStatus, BookingSubmission, EmailChallenge, Programme, Slot, SlotHold, VerifiedEmail } from './types';

export class BookingApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly retryAfterSeconds?: number) {
    super(message);
    this.name = 'BookingApiError';
  }
}

type RecordValue = Record<string, unknown>;
const invalid = () => new BookingApiError('The service returned incomplete data. Please try again.', 502);
function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  return value as RecordValue;
}
function string(value: unknown): string { if (typeof value !== 'string' || !value.trim()) throw invalid(); return value; }
function list<T>(value: unknown, parse: (item: unknown) => T): T[] { if (!Array.isArray(value)) throw invalid(); return value.map(parse); }
function amount(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw invalid(); return value; }
function timestamp(value: unknown): string {
  const text = string(value);
  // Require an explicit UTC offset; browser-local interpretation would shift bookings.
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(text) || !Number.isFinite(Date.parse(text))) throw invalid();
  return text;
}
function unique<T extends { id: string }>(items: T[]): T[] { if (new Set(items.map(item => item.id)).size !== items.length) throw invalid(); return items; }
export function parseProgrammes(value: unknown): Programme[] {
  return unique(list(value, item => {
    const data = record(item);
    const currency = string(data.currency);
    if (!/^[A-Z]{3}$/.test(currency)) throw invalid();
    try { new Intl.NumberFormat('en', { style: 'currency', currency }); } catch { throw invalid(); }
    const packages = unique(list(data.packages, item => {
      const tier = record(item);
      return { id: string(tier.id), name: string(tier.name), priceMinor: amount(tier.priceMinor), inclusions: list(tier.inclusions, item => {
        const inclusion = record(item);
        if (typeof inclusion.included !== 'boolean') throw invalid();
        return { label: string(inclusion.label), included: inclusion.included };
      }) };
    }));
    const addons = unique(list(data.addons, item => { const addon = record(item); return { id: string(addon.id), title: string(addon.title), priceMinor: amount(addon.priceMinor) }; }));
    if (!Number.isSafeInteger(Math.max(0, ...packages.map(item => item.priceMinor)) + addons.reduce((sum, item) => sum + item.priceMinor, 0))) throw invalid();
    return { id: string(data.id), title: string(data.title), summary: string(data.summary), duration: string(data.duration), currency, feeDisclosure: string(data.feeDisclosure), technologies: list(data.technologies, string), packages, addons };
  }));
}
export function parseSlot(value: unknown): Slot {
  const data = record(value);
  const slot = { id: string(data.id), startsAt: timestamp(data.startsAt), endsAt: timestamp(data.endsAt) };
  if (Date.parse(slot.endsAt) <= Date.parse(slot.startsAt)) throw invalid();
  return slot;
}
function parseChallenge(value: unknown): EmailChallenge {
  const data = record(value);
  const result = { challengeId: string(data.challengeId), expiresAt: timestamp(data.expiresAt), resendAt: timestamp(data.resendAt), serverNow: timestamp(data.serverNow) };
  if (Date.parse(result.expiresAt) <= Date.parse(result.serverNow) || Date.parse(result.resendAt) > Date.parse(result.expiresAt)) throw invalid();
  return result;
}
function parseVerification(value: unknown): VerifiedEmail {
  const data = record(value);
  const result = { verificationToken: string(data.verificationToken), expiresAt: timestamp(data.expiresAt), serverNow: timestamp(data.serverNow) };
  if (Date.parse(result.expiresAt) <= Date.parse(result.serverNow)) throw invalid();
  return result;
}
function parseHold(value: unknown): SlotHold {
  const data = record(value);
  const result = { holdId: string(data.holdId), expiresAt: timestamp(data.expiresAt), serverNow: timestamp(data.serverNow), slot: parseSlot(data.slot) };
  if (Date.parse(result.expiresAt) <= Date.parse(result.serverNow)) throw invalid();
  return result;
}
function parseReceipt(value: unknown): BookingReceipt {
  const data = record(value);
  return { bookingId: string(data.bookingId), programmeId: string(data.programmeId), email: string(data.email), slot: parseSlot(data.slot) };
}

/** Same-origin API by default. Authentication is sent in bodies, never query strings. */
export function createHttpBookingApi(baseUrl = '/api/booking', timeoutMs = 15000): BookingApi {
  const base = baseUrl.replace(/\/$/, '');
  async function request(path: string, options: { signal: AbortSignal; body?: unknown; requestId?: string; method?: string }): Promise<unknown> {
    const response = await fetch(`${base}${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      credentials: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(options.requestId ? { 'Idempotency-Key': options.requestId } : {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)]),
    });
    const contentType = response.headers.get('Content-Type') ?? '';
    const data: unknown = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      const message = response.status === 429 ? 'Too many attempts. Please wait before trying again.' : response.status === 409 ? 'That slot is no longer available. Choose another time.' : response.status === 401 ? 'Your verification has expired. Please verify your email again.' : response.status === 503 || response.status === 404 ? 'This service is not available yet. Please try again later.' : 'The request could not be completed. Please try again.';
      throw new BookingApiError(message, response.status, retryAfter > 0 ? retryAfter : undefined);
    }
    if (response.status === 204) return null;
    if (!data) throw invalid();
    return data;
  }
  return {
    getProgrammes: async signal => parseProgrammes(record(await request('/programmes', { signal })).programmes),
    sendOtp: async (about: AboutYou, requestId: string, signal) => parseChallenge(await request('/otp/send', { body: { about }, requestId, signal })),
    verifyOtp: async (challengeId, code, signal) => parseVerification(await request('/otp/verify', { body: { challengeId, code }, signal })),
    getSlots: async (programmeId, verificationToken, signal) => unique(list(record(await request('/slots/search', { body: { programmeId, verificationToken }, signal })).slots, parseSlot)),
    holdSlot: async (slotId, programmeId, verificationToken, requestId, signal) => parseHold(await request('/holds', { body: { slotId, programmeId, verificationToken }, requestId, signal })),
    releaseHold: async (holdId, verificationToken, signal) => { await request('/holds/release', { body: { holdId, verificationToken }, signal }); },
    confirmBooking: async (submission: BookingSubmission, signal) => parseReceipt(await request('/confirm', { body: submission, requestId: submission.requestId, signal })),
    getBookingStatus: async (requestId, verificationToken, signal): Promise<BookingStatus> => {
      const data = record(await request('/status', { body: { requestId, verificationToken }, signal }));
      if (data.status === 'confirmed') return { status: 'confirmed', booking: parseReceipt(data.booking) };
      if (data.status === 'pending' || data.status === 'not-found') return { status: data.status };
      throw invalid();
    },
  };
}
