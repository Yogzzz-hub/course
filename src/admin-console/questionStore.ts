import { notifyStorageChange, safeStorage } from '../analytics/consent';
import { questionBank, type Question } from '../assessment/questionBank';
import { validateBank } from '../assessment/schema';

/**
 * Draft question edits made in the console. Without a content API they stay on this device and
 * do not change the live test; publishing means committing them to src/assessment/questionBank.ts,
 * where the test suite verifies every answer key by execution.
 */
const OVERRIDES_KEY = 'aintrix-question-overrides';
const AUDIT_KEY = 'aintrix-admin-audit';

export interface ConsoleAuditEntry { at: string; actor: string; role: string; action: string; target: string; detail?: string }

function read<T>(key: string, fallback: T): T {
  try { const raw = safeStorage()?.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) { try { safeStorage()?.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } notifyStorageChange(); }

export const readDrafts = () => read<Question[]>(OVERRIDES_KEY, []);
export const readConsoleAudit = () => read<ConsoleAuditEntry[]>(AUDIT_KEY, []);
export function audit(entry: Omit<ConsoleAuditEntry, 'at'>) { write(AUDIT_KEY, [...readConsoleAudit(), { ...entry, at: new Date().toISOString() }].slice(-500)); }

/** The working bank: shipped questions with any local drafts layered on top (drafts win by id and version). */
export function workingBank(): Question[] {
  const drafts = readDrafts();
  const keyed = new Map(questionBank.map(question => [`${question.id}@${question.version}`, question]));
  for (const draft of drafts) keyed.set(`${draft.id}@${draft.version}`, draft);
  return [...keyed.values()];
}

/** Saves a new version and retires the previous active one. Rejects anything the validator flags. */
export function saveNewVersion(next: Question, actor: { id: string; role: string }) {
  const bank = workingBank();
  const previous = bank.filter(item => item.id === next.id);
  const version = Math.max(0, ...previous.map(item => item.version)) + 1;
  const candidate: Question = { ...next, version, status: next.status };
  const updatedPrevious = previous.filter(item => item.status === 'active' && candidate.status === 'active').map(item => ({ ...item, status: 'retired' as const }));
  const issues = validateBank([...bank.filter(item => !updatedPrevious.some(old => old.id === item.id && old.version === item.version)), ...updatedPrevious, candidate]).filter(issue => issue.id === candidate.id);
  if (issues.length) return { ok: false as const, issues };
  write(OVERRIDES_KEY, [...readDrafts().filter(item => !(item.id === candidate.id && (item.version === candidate.version || updatedPrevious.some(old => old.version === item.version)))), ...updatedPrevious, candidate]);
  audit({ actor: actor.id, role: actor.role, action: 'question.version', target: `${candidate.id}@${candidate.version}`, detail: candidate.status });
  return { ok: true as const, question: candidate };
}

export function retire(question: Question, actor: { id: string; role: string }) {
  write(OVERRIDES_KEY, [...readDrafts().filter(item => !(item.id === question.id && item.version === question.version)), { ...question, status: 'retired' }]);
  audit({ actor: actor.id, role: actor.role, action: 'question.retire', target: `${question.id}@${question.version}` });
}
export function discardDrafts(actor: { id: string; role: string }) {
  write(OVERRIDES_KEY, []);
  audit({ actor: actor.id, role: actor.role, action: 'question.discard-drafts', target: 'all' });
}
