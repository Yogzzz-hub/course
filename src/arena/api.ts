import { z } from 'zod';
import { notifyStorageChange, safeStorage } from '../analytics/consent';
import { judgeStatusSchema, publicCaseSchema, submissionResultSchema, type JudgeStatus, type SubmissionRequest, type SubmissionResult } from './contracts';

/**
 * Browser access to the judging service. Visitor code is only ever sent to that service, which
 * runs it in an isolated sandbox. With no service configured, judging is switched off; there is
 * deliberately no fallback that runs code in the browser or on the web server.
 */
const sampleRunSchema = z.object({ state: z.enum(['graded', 'judge_error']), message: z.string().optional(), compileError: z.string().optional(), cases: z.array(publicCaseSchema) });
export type SampleRun = z.infer<typeof sampleRunSchema>;

export interface JudgeApi {
  status(signal?: AbortSignal): Promise<JudgeStatus>;
  runSamples(challengeId: string, version: number, source: string): Promise<SampleRun>;
  submit(request: SubmissionRequest): Promise<SubmissionResult>;
  recordUnderstanding(submissionId: string, answers: { correct: number; total: number }): Promise<SubmissionResult>;
}

export const unavailableMessage = 'Live code judging is not connected on this site yet. Code only ever runs in the academy\'s isolated sandbox, never in your browser or on the web server, so Run and Submit stay off until that service is set up. You can still write your solution and take the understanding check.';
const unavailable = (): never => { throw new Error(unavailableMessage); };

export const unavailableJudgeApi: JudgeApi = {
  async status() { return { available: false, languages: [], message: unavailableMessage }; },
  runSamples: async () => unavailable(),
  submit: async () => unavailable(),
  recordUnderstanding: async () => unavailable(),
};

export function createHttpJudgeApi(baseUrl: string): JudgeApi {
  const root = baseUrl.replace(/\/$/, '');
  async function call<T>(path: string, parse: (value: unknown) => T, init?: RequestInit) {
    const response = await fetch(`${root}${path}`, { credentials: 'include', ...init, headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof (body as { message?: unknown })?.message === 'string' ? (body as { message: string }).message : response.status === 429 ? 'Too many submissions. Please wait a minute and try again.' : 'The judging service could not complete this request.');
    return parse(body);
  }
  return {
    status: signal => call('/judge/status', value => judgeStatusSchema.parse(value), { signal }),
    runSamples: (challengeId, version, source) => call(`/judge/challenges/${encodeURIComponent(challengeId)}/samples`, value => sampleRunSchema.parse(value), { method: 'POST', body: JSON.stringify({ version, source }) }),
    submit: request => call('/judge/submissions', value => submissionResultSchema.parse(value), { method: 'POST', body: JSON.stringify(request), headers: { 'Idempotency-Key': request.idempotencyKey } }),
    recordUnderstanding: (id, answers) => call(`/judge/submissions/${encodeURIComponent(id)}/understanding`, value => submissionResultSchema.parse(value), { method: 'POST', body: JSON.stringify(answers) }),
  };
}

export const judgeApi: JudgeApi = import.meta.env.VITE_JUDGE_API_URL ? createHttpJudgeApi(import.meta.env.VITE_JUDGE_API_URL) : unavailableJudgeApi;

/** Practice history on this device, saved only when the visitor chooses. Never used for public ranking. */
export interface PracticeEntry { challengeId: string; at: string; mode: 'assisted' | 'independent'; declaredAiUse: boolean; understanding: { correct: number; total: number }; judged: boolean; total: number | null }
const HISTORY_KEY = 'aintrix-arena-history';
export function readPractice(): PracticeEntry[] {
  try { const raw = safeStorage()?.getItem(HISTORY_KEY); return raw ? JSON.parse(raw) as PracticeEntry[] : []; } catch { return []; }
}
export function savePractice(entry: PracticeEntry) {
  try { safeStorage()?.setItem(HISTORY_KEY, JSON.stringify([...readPractice(), entry].slice(-100))); } catch { /* storage unavailable */ }
  notifyStorageChange();
}
