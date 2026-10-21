import { useSyncExternalStore } from 'react';

/**
 * Consent for optional analytics. Nothing optional is stored or measured until the visitor opts in;
 * "essential" keeps only what a feature the visitor asked for needs to work.
 */
export const POLICY_VERSION = '2026-10-21';
export const RETENTION_DAYS = 90;
const CONSENT_KEY = 'aintrix-consent';

export type ConsentChoice = 'essential' | 'analytics';
export interface ConsentRecord { choice: ConsentChoice; policyVersion: string; decidedAt: string }

const listeners = new Set<() => void>();
let cached: ConsentRecord | null | undefined;

export function safeStorage(kind: 'local' | 'session' = 'local'): Storage | null {
  try { return typeof window === 'undefined' ? null : kind === 'local' ? window.localStorage : window.sessionStorage; } catch { return null; }
}

export function getConsent(): ConsentRecord | null {
  if (cached !== undefined) return cached;
  try {
    const raw = safeStorage()?.getItem(CONSENT_KEY);
    const parsed = raw ? JSON.parse(raw) as ConsentRecord : null;
    // A consent given under an older policy no longer counts.
    cached = parsed && parsed.policyVersion === POLICY_VERSION && (parsed.choice === 'essential' || parsed.choice === 'analytics') ? parsed : null;
  } catch { cached = null; }
  return cached;
}
export const analyticsAllowed = () => getConsent()?.choice === 'analytics';

export function setConsent(choice: ConsentChoice, now = new Date()) {
  const record: ConsentRecord = { choice, policyVersion: POLICY_VERSION, decidedAt: now.toISOString() };
  try { safeStorage()?.setItem(CONSENT_KEY, JSON.stringify(record)); } catch { /* The choice still applies for this page view. */ }
  cached = record;
  if (choice === 'essential') clearOptionalData();
  listeners.forEach(listener => listener());
}

/** Optional analytics keys. Removed when consent is withdrawn or the visitor deletes their data. */
export const optionalKeys = ['aintrix-events', 'aintrix-visitor', 'aintrix-experiments'];
/** Everything this site stores on the device, including feature data the visitor chose to save. */
export const allKeys = [...optionalKeys, CONSENT_KEY, 'aintrix-assessment-progress', 'aintrix-assessment-history', 'aintrix-arena-history', 'aintrix-roadmap', 'aintrix-leaderboard-profile', 'aintrix-question-overrides', 'aintrix-admin-audit', 'aintrix-admin-role'];

export function clearOptionalData() {
  const local = safeStorage();
  optionalKeys.forEach(key => { try { local?.removeItem(key); } catch { /* ignore */ } });
  try { safeStorage('session')?.removeItem('aintrix-session'); } catch { /* ignore */ }
  listeners.forEach(listener => listener());
}

/** Deletes every Aintrix key on this device and returns to "no choice made". */
export function deleteAllLocalData() {
  const local = safeStorage();
  allKeys.forEach(key => { try { local?.removeItem(key); } catch { /* ignore */ } });
  try { safeStorage('session')?.clear(); } catch { /* ignore */ }
  cached = null;
  listeners.forEach(listener => listener());
}

export function subscribeConsent(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (!event.key || event.key === CONSENT_KEY) { cached = undefined; listener(); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}
export function useConsent() {
  return useSyncExternalStore(subscribeConsent, getConsent, () => null);
}
export function notifyStorageChange() { listeners.forEach(listener => listener()); }
