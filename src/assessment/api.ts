import { z } from 'zod';
import { answerCurrent, createAttempt, currentQuestion, findQuestion, type Attempt } from './engine';
import { activeQuestions, questionBank, type Question } from './questionBank';
import { scoreAttempt, type AssessmentResult } from './results';
import { clearProgress, latestAttempt, loadProgress, saveProgress, saveToHistory, setLatestAttempt } from './store';
import type { FocusId, Skill, TrackId } from './skills';

/** What a visitor sees for a question: never the answer key. */
export interface QuestionView {
  id: string; version: number; skill: Skill; difficulty: 1 | 2 | 3; kind: Question['kind'];
  prompt: string; code?: Question['code']; codeOptions?: boolean; options: { id: string; text: string }[];
}
export interface AttemptView { attemptId: string; status: Attempt['status']; index: number; total: number; track: TrackId; focus: FocusId; startedAt: string; question?: QuestionView }

/**
 * The contract a backend must implement to take over scoring. A server version keeps the answer
 * key private and computes results itself; clients can never submit their own score.
 */
export interface AssessmentApi {
  readonly mode: 'local' | 'server';
  start(input: { track: TrackId; focus: FocusId; saveProgress: boolean }): Promise<AttemptView>;
  resume(): Promise<AttemptView | null>;
  answer(attemptId: string, optionId: string, idempotencyKey: string): Promise<AttemptView>;
  result(attemptId: string): Promise<AssessmentResult>;
  discard(attemptId: string): Promise<void>;
}

function view(attempt: Attempt, bank: Question[] = questionBank): AttemptView {
  const current = currentQuestion(attempt);
  const question = current ? findQuestion(bank, current) : undefined;
  const answered = attempt.asked.filter(item => item.selected !== undefined).length;
  return {
    attemptId: attempt.id, status: attempt.status, index: Math.min(answered, attempt.length - 1), total: attempt.length, track: attempt.track, focus: attempt.focus, startedAt: attempt.startedAt,
    question: question && current ? { id: question.id, version: question.version, skill: question.skill, difficulty: question.difficulty, kind: question.kind, prompt: question.prompt, code: question.code, codeOptions: question.codeOptions, options: current.optionOrder.map(id => question.options.find(option => option.id === id)!) } : undefined,
  };
}

/**
 * Runs the test in this browser. Scores are truthful but the answer key ships with the page,
 * so local results are a self-assessment and never feed the public leaderboard.
 */
export function createLocalAssessmentApi(): AssessmentApi {
  const attempts = new Map<string, { attempt: Attempt; save: boolean; seen: Set<string> }>();
  const get = (id: string) => {
    const entry = attempts.get(id) ?? (() => { const saved = loadProgress() ?? latestAttempt(); return saved?.id === id ? { attempt: saved, save: !!loadProgress(), seen: new Set<string>() } : undefined; })();
    if (!entry) throw new Error('This attempt has expired. Please start a new test.');
    attempts.set(id, entry);
    return entry;
  };
  return {
    mode: 'local',
    async start({ track, focus, saveProgress: save }) {
      const attempt = createAttempt({ track, focus, bank: activeQuestions() });
      attempts.set(attempt.id, { attempt, save, seen: new Set() });
      if (save) saveProgress(attempt); else clearProgress();
      return view(attempt);
    },
    async resume() {
      const saved = loadProgress();
      if (!saved) return null;
      attempts.set(saved.id, { attempt: saved, save: true, seen: new Set() });
      return view(saved);
    },
    async answer(attemptId, optionId, idempotencyKey) {
      const entry = get(attemptId);
      // A repeated submission (double click, retry) returns the same state instead of answering twice.
      if (entry.seen.has(idempotencyKey)) return view(entry.attempt);
      entry.attempt = answerCurrent(entry.attempt, optionId);
      entry.seen.add(idempotencyKey);
      if (entry.attempt.status === 'completed') {
        clearProgress();
        setLatestAttempt(entry.attempt);
        if (entry.save) saveToHistory(scoreAttempt(entry.attempt));
      } else if (entry.save) saveProgress(entry.attempt);
      return view(entry.attempt);
    },
    async result(attemptId) {
      const entry = get(attemptId);
      if (entry.attempt.status !== 'completed') throw new Error('Finish every question to see your results.');
      return scoreAttempt(entry.attempt);
    },
    async discard(attemptId) { attempts.delete(attemptId); clearProgress(); },
  };
}

const attemptViewSchema = z.object({
  attemptId: z.string(), status: z.enum(['in_progress', 'completed']), index: z.number().int().min(0), total: z.number().int().min(1), track: z.enum(['beginner', 'intermediate', 'advanced']), focus: z.enum(['core', 'backend', 'fullstack']), startedAt: z.string(),
  question: z.object({ id: z.string(), version: z.number(), skill: z.string(), difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]), kind: z.enum(['mcq', 'output', 'debug']), prompt: z.string(), code: z.object({ language: z.enum(['python', 'javascript', 'sql']), source: z.string(), fixture: z.literal('students').optional() }).optional(), codeOptions: z.boolean().optional(), options: z.array(z.object({ id: z.string(), text: z.string() })) }).optional(),
});

/** HTTP adapter for a future assessment service; responses are validated before the UI sees them. */
export function createHttpAssessmentApi(baseUrl: string): AssessmentApi {
  const root = baseUrl.replace(/\/$/, '');
  async function call<T>(path: string, parse: (value: unknown) => T, init?: RequestInit) {
    const response = await fetch(`${root}${path}`, { credentials: 'include', ...init, headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof (body as { message?: unknown })?.message === 'string' ? (body as { message: string }).message : 'The assessment service could not complete this request.');
    return parse(body);
  }
  const parseView = (value: unknown) => attemptViewSchema.parse(value) as AttemptView;
  return {
    mode: 'server',
    start: input => call('/assessments', parseView, { method: 'POST', body: JSON.stringify(input) }),
    resume: () => call('/assessments/current', value => value ? parseView(value) : null),
    answer: (attemptId, optionId, idempotencyKey) => call(`/assessments/${encodeURIComponent(attemptId)}/answers`, parseView, { method: 'POST', body: JSON.stringify({ optionId }), headers: { 'Idempotency-Key': idempotencyKey } }),
    result: attemptId => call(`/assessments/${encodeURIComponent(attemptId)}/result`, value => value as AssessmentResult),
    discard: attemptId => call(`/assessments/${encodeURIComponent(attemptId)}`, () => undefined, { method: 'DELETE' }),
  };
}

export const assessmentApi: AssessmentApi = import.meta.env.VITE_ASSESSMENT_API_URL ? createHttpAssessmentApi(import.meta.env.VITE_ASSESSMENT_API_URL) : createLocalAssessmentApi();
