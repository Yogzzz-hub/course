import { notifyStorageChange, safeStorage } from '../analytics/consent';
import { findQuestion, type Attempt } from './engine';
import { BANK_VERSION, questionBank } from './questionBank';
import type { AssessmentResult } from './results';

/**
 * Device-only storage for the visitor's own test. Progress is saved only when the visitor ticks
 * "Save my progress on this device"; the latest finished attempt is kept for this tab so the
 * roadmap can read it, and disappears when the tab closes.
 */
const PROGRESS_KEY = 'aintrix-assessment-progress';
const HISTORY_KEY = 'aintrix-assessment-history';
const LATEST_KEY = 'aintrix-latest-attempt';

function validAttempt(value: unknown): value is Attempt {
  const attempt = value as Attempt;
  return !!attempt && typeof attempt.id === 'string' && attempt.bankVersion === BANK_VERSION && Array.isArray(attempt.asked) && attempt.asked.every(item => !!findQuestion(questionBank, item));
}
function read(key: string, kind: 'local' | 'session' = 'local'): unknown {
  try { const raw = safeStorage(kind)?.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function write(key: string, value: unknown, kind: 'local' | 'session' = 'local') {
  try { safeStorage(kind)?.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked: the test still works in memory */ }
  notifyStorageChange();
}

export function saveProgress(attempt: Attempt) { write(PROGRESS_KEY, attempt); }
export function loadProgress(): Attempt | null { const value = read(PROGRESS_KEY); return validAttempt(value) && value.status === 'in_progress' ? value : null; }
export function clearProgress() { try { safeStorage()?.removeItem(PROGRESS_KEY); } catch { /* ignore */ } notifyStorageChange(); }
export const hasSavedProgress = () => !!loadProgress();

export function setLatestAttempt(attempt: Attempt) { write(LATEST_KEY, attempt, 'session'); }
export function latestAttempt(): Attempt | null { const value = read(LATEST_KEY, 'session'); return validAttempt(value) && value.status === 'completed' ? value : null; }

export interface HistoryEntry { attemptId: string; completedAt: string; percent: number; correct: number; asked: number; skills: Partial<Record<string, { percent: number; level: string }>> }
export function saveToHistory(result: AssessmentResult) {
  const entry: HistoryEntry = { attemptId: result.attemptId, completedAt: result.completedAt, percent: result.total.percent, correct: result.total.correct, asked: result.total.asked, skills: Object.fromEntries(result.skills.map(item => [item.skill, { percent: item.percent, level: item.level }])) };
  const history = readHistory().filter(item => item.attemptId !== entry.attemptId);
  write(HISTORY_KEY, [...history, entry].slice(-20));
}
export function readHistory(): HistoryEntry[] { const value = read(HISTORY_KEY); return Array.isArray(value) ? value as HistoryEntry[] : []; }
