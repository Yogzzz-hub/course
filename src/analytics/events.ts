import { analyticsAllowed, RETENTION_DAYS, safeStorage } from './consent';

/**
 * First-party product events, stored on this device only and only after analytics consent.
 * No fingerprinting, no third parties, no free text. Props are restricted to short primitives.
 * Payment confirmation is server-only: a browser can never record it.
 */
export const eventNames = [
  'page_view', 'course_viewed', 'assessment_started', 'assessment_completed', 'roadmap_viewed',
  'coding_challenge_started', 'code_submitted', 'understanding_completed', 'package_compared',
  'counselling_requested', 'enrollment_started', 'payment_confirmed', 'experiment_exposure', 'prompt_clicked',
] as const;
export type EventName = typeof eventNames[number];
export const serverOnlyEvents: EventName[] = ['payment_confirmed'];

export type Channel = 'organic' | 'direct' | 'referral' | 'campaign' | 'internal';
export type EventProps = Record<string, string | number | boolean>;
export interface StoredEvent { id: string; name: EventName; at: string; path: string; visitor: string; session: string; channel: Channel; landing: string; campaign?: string; props: EventProps }

const EVENTS_KEY = 'aintrix-events';
const VISITOR_KEY = 'aintrix-visitor';
const SESSION_KEY = 'aintrix-session';
const MAX_EVENTS = 2000;
const blockedProps = /email|phone|name|address|password|token|message|description|code/i;

const randomId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export function sanitiseProps(props: Record<string, unknown> = {}): EventProps {
  const clean: EventProps = {};
  for (const [key, value] of Object.entries(props).slice(0, 24)) {
    if (!/^[a-zA-Z][\w-]{0,31}$/.test(key) || blockedProps.test(key)) continue;
    if (typeof value === 'string') clean[key] = value.slice(0, 80);
    else if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value;
    else if (typeof value === 'boolean') clean[key] = value;
  }
  return clean;
}

const searchHosts = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia)\./i;
/** Classifies where a session came from using the referrer and UTM parameters only. */
export function classifySource(href: string, referrer: string): { channel: Channel; campaign?: string } {
  const url = new URL(href);
  const campaign = url.searchParams.get('utm_campaign') || url.searchParams.get('utm_source');
  if (campaign) return { channel: 'campaign', campaign: campaign.slice(0, 60) };
  if (!referrer) return { channel: 'direct' };
  try {
    const from = new URL(referrer);
    if (from.host === url.host) return { channel: 'internal' };
    return { channel: searchHosts.test(from.hostname) ? 'organic' : 'referral' };
  } catch { return { channel: 'direct' }; }
}

export function readEvents(): StoredEvent[] {
  try {
    const raw = safeStorage()?.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as StoredEvent[]).filter(event => event && eventNames.includes(event.name)) : [];
  } catch { return []; }
}
export function pruneEvents(events: StoredEvent[], now = new Date()) {
  const cutoff = now.getTime() - RETENTION_DAYS * 86_400_000;
  return events.filter(event => Date.parse(event.at) >= cutoff).slice(-MAX_EVENTS);
}

/** A random first-party id, created only after analytics consent. Never derived from the device. */
export function visitorId() {
  if (!analyticsAllowed()) return null;
  const store = safeStorage();
  let id = store?.getItem(VISITOR_KEY);
  if (!id) { id = randomId(); store?.setItem(VISITOR_KEY, id); }
  return id;
}
function session(): { id: string; channel: Channel; landing: string; campaign?: string } {
  const store = safeStorage('session');
  try {
    const raw = store?.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* start a new session */ }
  const source = classifySource(window.location.href, document.referrer);
  const created = { id: randomId(), channel: source.channel === 'internal' ? 'direct' as Channel : source.channel, landing: window.location.pathname, campaign: source.campaign };
  try { store?.setItem(SESSION_KEY, JSON.stringify(created)); } catch { /* ignore */ }
  return created;
}

const listeners = new Set<() => void>();
export function subscribeEvents(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

/** Records an event if, and only if, the visitor allowed optional analytics. Returns whether it was stored. */
export function track(name: EventName, props?: Record<string, unknown>, now = new Date()): boolean {
  if (typeof window === 'undefined' || !analyticsAllowed()) return false;
  if (serverOnlyEvents.includes(name)) return false;
  try {
    const current = session();
    const event: StoredEvent = { id: randomId(), name, at: now.toISOString(), path: window.location.pathname, visitor: visitorId() ?? 'unknown', session: current.id, channel: current.channel, landing: current.landing, ...(current.campaign ? { campaign: current.campaign } : {}), props: sanitiseProps(props) };
    safeStorage()?.setItem(EVENTS_KEY, JSON.stringify(pruneEvents([...readEvents(), event], now)));
    listeners.forEach(listener => listener());
    return true;
  } catch { return false; }
}

export function trackOncePerSession(name: EventName, key: string, props?: Record<string, unknown>) {
  const store = safeStorage('session');
  const marker = `aintrix-once-${name}-${key}`;
  try { if (store?.getItem(marker)) return false; } catch { /* continue */ }
  const stored = track(name, props);
  if (stored) try { store?.setItem(marker, '1'); } catch { /* ignore */ }
  return stored;
}

let snapshotRaw: string | null | undefined;
let snapshot: StoredEvent[] = [];
/** Cached view for useSyncExternalStore: the same array until the stored events change. */
export function eventsSnapshot(): StoredEvent[] {
  let raw: string | null;
  try { raw = safeStorage()?.getItem(EVENTS_KEY) ?? null; } catch { raw = null; }
  if (raw !== snapshotRaw) { snapshotRaw = raw; snapshot = readEvents(); }
  return snapshot;
}
const emptyEvents: StoredEvent[] = [];
export const serverEventsSnapshot = () => emptyEvents;
