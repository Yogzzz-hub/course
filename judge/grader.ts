import { seededRandom } from '../src/assessment/engine';
import type { Challenge } from '../src/arena/challenges';
import { edgeTags, submissionRequestSchema, type CaseVerdict, type PublicCase, type ScoreBreakdown, type SubmissionRequest, type SubmissionResult, type SubmissionState, type TestTag } from '../src/arena/contracts';
import { requirePermission, type Actor } from '../src/admin-console/permissions';
import { matches } from './compare';
import { Semaphore } from './limits';
import type { CaseReport, ExecutionAdapter, ExecutionResult, Expectation, HiddenChallenge, LanguageAdapter } from './types';

export const GRADER_VERSION = 'grader-2026.10.1';

export interface AuditEntry { at: string; actor: string; action: 'created' | 'started' | 'retry' | 'graded' | 'judge_error' | 'rejudged' | 'corrected' | 'understanding'; detail?: string }
export interface SubmissionRecord { id: string; userId: string; request: SubmissionRequest; state: SubmissionState; result?: SubmissionResult; history: AuditEntry[]; understanding?: { correct: number; total: number } }
export interface SubmissionStore {
  get(id: string): SubmissionRecord | undefined;
  byKey(userId: string, idempotencyKey: string): SubmissionRecord | undefined;
  save(record: SubmissionRecord): void;
  list(): SubmissionRecord[];
}
export class MemorySubmissionStore implements SubmissionStore {
  private records = new Map<string, SubmissionRecord>();
  get(id: string) { return this.records.get(id); }
  byKey(userId: string, key: string) { return [...this.records.values()].find(item => item.userId === userId && item.request.idempotencyKey === key); }
  save(record: SubmissionRecord) { this.records.set(record.id, structuredClone(record)); }
  list() { return [...this.records.values()]; }
}

export class GradingInputError extends Error { readonly status = 400; constructor(message: string) { super(message); this.name = 'GradingInputError'; } }

export interface GraderOptions {
  executor: ExecutionAdapter;
  language: LanguageAdapter;
  challenges: Challenge[];
  hidden: HiddenChallenge[];
  store?: SubmissionStore;
  /** Maximum programs running at once. */
  concurrency?: number;
  /** Retries after an infrastructure failure (never after a candidate failure). */
  retries?: number;
  backoffMs?: number;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  token?: () => string;
  newId?: () => string;
}

interface CaseSpec { id: string; args: unknown[]; expect: Expectation; tags: TestTag[]; visibility: 'public' | 'hidden' }

const randomToken = () => `@@${globalThis.crypto.randomUUID()}@@`;
const round1 = (value: number) => Math.round(value * 10) / 10;

export function createGrader(options: GraderOptions) {
  const { executor, language, challenges, hidden } = options;
  const store = options.store ?? new MemorySubmissionStore();
  const semaphore = new Semaphore(options.concurrency ?? 4);
  const retries = options.retries ?? 2;
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? (ms => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const token = options.token ?? randomToken;
  const newId = options.newId ?? (() => `sub_${globalThis.crypto.randomUUID()}`);
  const referenceCache = new Map<string, unknown[][]>();
  if (!executor.acceptsUntrustedCode && process.env.NODE_ENV === 'production') throw new Error(`Executor "${executor.name}" must not judge visitor code in production.`);

  const specFor = (challengeId: string, version: number) => {
    const challenge = challenges.find(item => item.id === challengeId && item.version === version);
    const secret = hidden.find(item => item.challengeId === challengeId && item.version === version);
    if (!challenge || !secret) throw new GradingInputError('That challenge version is not available.');
    return { challenge, secret };
  };

  /** Runs a program with retries on infrastructure failures only. */
  async function execute(program: string, stdin: string, limits: Challenge['limits'], onRetry: (attempt: number, result: ExecutionResult) => void) {
    let result: ExecutionResult = { status: 'infrastructure_error', stdout: '', stderr: '', message: 'Not started' };
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) { onRetry(attempt, result); await sleep((options.backoffMs ?? 250) * 2 ** (attempt - 1)); }
      try { result = await semaphore.use(() => executor.execute({ language: 'python', program, stdin, limits })); }
      catch (cause) { result = { status: 'infrastructure_error', stdout: '', stderr: '', message: cause instanceof Error ? cause.message : 'Executor failed' }; }
      if (result.status !== 'infrastructure_error') return { result, attempts: attempt + 1 };
    }
    return { result, attempts: retries + 1 };
  }

  /** Property inputs are generated deterministically; their expected values come from the trusted reference. */
  async function propertyCases(challenge: Challenge, secret: HiddenChallenge, onRetry: (attempt: number, result: ExecutionResult) => void): Promise<{ cases: CaseSpec[] } | { error: string; attempts: number }> {
    if (!secret.property) return { cases: [] };
    const random = seededRandom(secret.property.seed);
    const inputs = Array.from({ length: secret.property.count }, () => secret.property!.generate(random));
    const key = `${challenge.id}@${challenge.version}:${secret.property.seed}`;
    let outputs = referenceCache.get(key);
    if (!outputs) {
      const runToken = token();
      const cases = inputs.map((args, index) => ({ id: `p${index}`, args }));
      const { result, attempts } = await execute(language.buildProgram(secret.reference, challenge.functionName, runToken), JSON.stringify(cases), challenge.limits, onRetry);
      if (result.status === 'infrastructure_error') return { error: `The judging service is unavailable (${result.message ?? 'no response'}). This is not a problem with your code; it can be judged again.`, attempts };
      const parsed = language.parseOutput(result.stdout, runToken);
      if (result.status !== 'ok' || parsed.fatal || parsed.cases.length !== cases.length || parsed.cases.some(item => !item.ok)) return { error: 'The reference solution failed on the randomised tests, so this challenge needs attention from the academy. This is not a problem with your code.', attempts };
      outputs = parsed.cases.map(item => [(item as { value: unknown }).value]);
      referenceCache.set(key, outputs);
    }
    return { cases: inputs.map((args, index) => ({ id: `p${index}`, args, expect: { value: outputs![index][0] }, tags: ['property'] as TestTag[], visibility: 'hidden' as const })) };
  }

  function verdictFor(spec: CaseSpec, report: CaseReport | undefined, comparator: Challenge['comparator'], fallback: CaseVerdict): { verdict: CaseVerdict; actual?: unknown; error?: string } {
    if (!report) return { verdict: fallback };
    if ('error' in spec.expect) {
      if (!report.ok && report.error === spec.expect.error) return { verdict: 'passed', error: report.error };
      return report.ok ? { verdict: 'wrong_answer', actual: report.value } : { verdict: 'runtime_error', error: report.error };
    }
    if (!report.ok) return { verdict: 'runtime_error', error: report.message ? `${report.error}: ${report.message}` : report.error };
    return matches(spec.expect.value, report.value, comparator) ? { verdict: 'passed', actual: report.value } : { verdict: 'wrong_answer', actual: report.value };
  }

  function score(challenge: Challenge, verdicts: { spec: CaseSpec; verdict: CaseVerdict }[], understanding?: { correct: number; total: number }): ScoreBreakdown {
    const bucket = (edge: boolean) => verdicts.filter(item => item.spec.tags.some(tag => edgeTags.includes(tag)) === edge);
    const share = (items: typeof verdicts) => items.length ? round1((items.filter(item => item.verdict === 'passed').length / items.length) * 100) : null;
    const parts = { correctness: share(bucket(false)), edge: share(bucket(true)), understanding: understanding?.total ? round1((understanding.correct / understanding.total) * 100) : null, quality: null as number | null };
    const weights = challenge.rubric;
    let weighted = 0, assessed = 0;
    for (const key of ['correctness', 'edge', 'understanding', 'quality'] as const) {
      const value = parts[key];
      if (value === null) continue;
      weighted += value * weights[key];
      assessed += weights[key];
    }
    // Components that were not assessed are left out and the total is rescaled; assessedWeight says how much was measured.
    return { ...parts, total: assessed ? round1(weighted / assessed) : null, assessedWeight: assessed };
  }

  async function judge(record: SubmissionRecord, actor: string): Promise<SubmissionRecord> {
    const { challenge, secret } = specFor(record.request.challengeId, record.request.challengeVersion);
    record.state = 'running';
    record.history.push({ at: now().toISOString(), actor, action: 'started', detail: GRADER_VERSION });
    store.save(record);
    const createdAt = record.result?.createdAt ?? record.history[0].at;
    const fail = (message: string, attempts: number) => {
      record.state = 'judge_error';
      record.result = { submissionId: record.id, challengeId: challenge.id, challengeVersion: challenge.version, state: 'judge_error', graderVersion: GRADER_VERSION, attempts, publicCases: [], hidden: { passed: 0, total: 0, byTag: {} }, score: { correctness: null, edge: null, understanding: null, quality: null, total: null, assessedWeight: 0 }, judgeError: message, createdAt };
      record.history.push({ at: now().toISOString(), actor, action: 'judge_error', detail: message });
      store.save(record);
      return record;
    };
    const onRetry = (attempt: number, previous: ExecutionResult) => record.history.push({ at: now().toISOString(), actor: 'system', action: 'retry', detail: `attempt ${attempt + 1} after ${previous.message ?? previous.status}` });
    const prepared = await propertyCases(challenge, secret, onRetry);
    if ('error' in prepared) return fail(prepared.error, prepared.attempts);
    const property = prepared.cases;
    const specs: CaseSpec[] = [
      ...challenge.examples.map(example => ({ id: `public:${example.id}`, args: example.args, expect: example.expect, tags: ['example'] as TestTag[], visibility: 'public' as const })),
      ...secret.tests.map(test => ({ id: `hidden:${test.id}`, args: test.args, expect: test.expect, tags: test.tags, visibility: 'hidden' as const })),
      ...property.map(item => ({ ...item, id: `property:${item.id}` })),
    ];
    const runToken = token();
    const { result, attempts } = await execute(language.buildProgram(record.request.source, challenge.functionName, runToken), JSON.stringify(specs.map(spec => ({ id: spec.id, args: spec.args }))), challenge.limits, onRetry);
    if (result.status === 'infrastructure_error') return fail(`The judging service is unavailable (${result.message ?? 'no response'}). This is not a problem with your code; it can be judged again.`, attempts);
    const parsed = language.parseOutput(result.stdout, runToken);
    const reports = new Map(parsed.cases.map(item => [item.id, item]));
    const compileError = parsed.fatal ? `${parsed.fatal.error}: ${parsed.fatal.message}` : undefined;
    // Cases that never reported share the run's fate: a timeout, memory or output limit, or a crash.
    const fallback: CaseVerdict = parsed.fatal ? 'compile_error' : result.status === 'time_limit' ? 'time_limit' : result.status === 'memory_limit' ? 'memory_limit' : result.status === 'ok' ? 'not_run' : 'runtime_error';
    const verdicts = specs.map(spec => ({ spec, ...verdictFor(spec, parsed.fatal ? undefined : reports.get(spec.id), challenge.comparator, fallback) }));
    const byTag: Record<string, { passed: number; total: number }> = {};
    for (const item of verdicts.filter(entry => entry.spec.visibility === 'hidden')) for (const tag of item.spec.tags) {
      byTag[tag] ??= { passed: 0, total: 0 };
      byTag[tag].total++;
      if (item.verdict === 'passed') byTag[tag].passed++;
    }
    const hiddenItems = verdicts.filter(item => item.spec.visibility === 'hidden');
    const publicCases: PublicCase[] = verdicts.filter(item => item.spec.visibility === 'public').map(item => ({ id: item.spec.id.replace('public:', ''), verdict: item.verdict, args: item.spec.args, expected: 'error' in item.spec.expect ? `raises ${item.spec.expect.error}` : item.spec.expect.value, ...(item.actual !== undefined ? { actual: item.actual } : {}), ...(item.error ? { error: item.error } : {}) }));
    record.state = 'graded';
    record.result = {
      submissionId: record.id, challengeId: challenge.id, challengeVersion: challenge.version, state: 'graded', graderVersion: GRADER_VERSION, attempts,
      publicCases,
      hidden: { passed: hiddenItems.filter(item => item.verdict === 'passed').length, total: hiddenItems.length, byTag },
      score: score(challenge, verdicts, record.understanding),
      ...(compileError ? { compileError } : {}),
      createdAt, gradedAt: now().toISOString(),
    };
    record.history.push({ at: now().toISOString(), actor, action: 'graded', detail: `total ${record.result.score.total}` });
    store.save(record);
    return record;
  }

  return {
    store,
    /** Validates, de-duplicates by idempotency key, then judges. Client-sent scores are ignored. */
    async submit(input: unknown, user: { id: string } | null): Promise<SubmissionResult> {
      if (!user?.id) throw new GradingInputError('Sign in to submit code for judging.');
      const parsed = submissionRequestSchema.safeParse(input);
      if (!parsed.success) throw new GradingInputError(parsed.error.issues[0]?.message ?? 'Invalid submission.');
      const existing = store.byKey(user.id, parsed.data.idempotencyKey);
      if (existing) return existing.result ?? (await judge(existing, user.id)).result!;
      specFor(parsed.data.challengeId, parsed.data.challengeVersion);
      const record: SubmissionRecord = { id: newId(), userId: user.id, request: parsed.data, state: 'queued', history: [{ at: now().toISOString(), actor: user.id, action: 'created' }] };
      store.save(record);
      return (await judge(record, user.id)).result!;
    },
    /** Public examples only, for the "Run sample tests" button. Nothing hidden is executed or returned. */
    async runSamples(challengeId: string, version: number, source: string) {
      const { challenge } = specFor(challengeId, version);
      if (source.length > 20_000) throw new GradingInputError('Keep submissions under 20,000 characters.');
      const runToken = token();
      const cases = challenge.examples.map(example => ({ id: example.id, args: example.args }));
      const { result } = await execute(language.buildProgram(source, challenge.functionName, runToken), JSON.stringify(cases), challenge.limits, () => {});
      if (result.status === 'infrastructure_error') return { state: 'judge_error' as const, message: 'The judging service is unavailable. This is not a problem with your code.', cases: [] };
      const parsed = language.parseOutput(result.stdout, runToken);
      const reports = new Map(parsed.cases.map(item => [item.id, item]));
      const fallback: CaseVerdict = parsed.fatal ? 'compile_error' : result.status === 'time_limit' ? 'time_limit' : result.status === 'ok' ? 'not_run' : 'runtime_error';
      return { state: 'graded' as const, compileError: parsed.fatal ? `${parsed.fatal.error}: ${parsed.fatal.message}` : undefined, cases: challenge.examples.map(example => {
        const spec: CaseSpec = { id: example.id, args: example.args, expect: example.expect, tags: ['example'], visibility: 'public' };
        const outcome = verdictFor(spec, parsed.fatal ? undefined : reports.get(example.id), challenge.comparator, fallback);
        return { id: example.id, args: example.args, expected: 'error' in example.expect ? `raises ${example.expect.error}` : example.expect.value, ...outcome };
      }) };
    },
    /** A submission's owner, or staff allowed to review grades, can read it. Nobody else. */
    get(id: string, actor: Actor | null): SubmissionResult {
      const record = store.get(id);
      if (!record) throw new GradingInputError('Submission not found.');
      if (actor?.id !== record.userId) requirePermission(actor, 'grades.review');
      return record.result!;
    },
    async rejudge(id: string, actor: Actor | null) {
      requirePermission(actor, 'grades.rejudge');
      const record = store.get(id);
      if (!record) throw new GradingInputError('Submission not found.');
      record.history.push({ at: now().toISOString(), actor: actor.id, action: 'rejudged', detail: `previous ${record.result?.graderVersion ?? 'none'} total ${record.result?.score.total ?? 'none'}` });
      return (await judge(record, actor.id)).result!;
    },
    correct(id: string, actor: Actor | null, correction: { total: number; reason: string }) {
      requirePermission(actor, 'grades.correct');
      const record = store.get(id);
      if (!record?.result) throw new GradingInputError('Submission not found.');
      if (!(correction.total >= 0 && correction.total <= 100)) throw new GradingInputError('A corrected score must be between 0 and 100.');
      if (correction.reason.trim().length < 10) throw new GradingInputError('Explain the correction in at least 10 characters.');
      record.history.push({ at: now().toISOString(), actor: actor.id, action: 'corrected', detail: `${record.result.score.total} → ${correction.total}: ${correction.reason.trim()}` });
      record.result = { ...record.result, score: { ...record.result.score, total: correction.total }, correctedBy: actor.id, correctionReason: correction.reason.trim() };
      store.save(record);
      return record.result;
    },
    /** Folds a completed understanding check into the score. Only the submission's owner may record it. */
    recordUnderstanding(id: string, user: { id: string } | null, answers: { correct: number; total: number }) {
      const record = store.get(id);
      if (!record?.result || record.userId !== user?.id) throw new GradingInputError('Submission not found.');
      if (!(answers.total > 0 && answers.correct >= 0 && answers.correct <= answers.total)) throw new GradingInputError('Invalid understanding result.');
      const { challenge } = specFor(record.request.challengeId, record.request.challengeVersion);
      record.understanding = answers;
      const base = record.result.score;
      const understanding = round1((answers.correct / answers.total) * 100);
      let weighted = 0, assessed = 0;
      for (const [key, value] of [['correctness', base.correctness], ['edge', base.edge], ['understanding', understanding], ['quality', base.quality]] as const) {
        if (value === null) continue;
        weighted += value * challenge.rubric[key];
        assessed += challenge.rubric[key];
      }
      record.result = { ...record.result, score: { ...base, understanding, total: assessed ? round1(weighted / assessed) : null, assessedWeight: assessed } };
      record.history.push({ at: now().toISOString(), actor: user.id, action: 'understanding', detail: `${answers.correct}/${answers.total}` });
      store.save(record);
      return record.result;
    },
    audit(id: string, actor: Actor | null) {
      requirePermission(actor, 'grades.review');
      return store.get(id)?.history ?? [];
    },
  };
}
export type Grader = ReturnType<typeof createGrader>;
