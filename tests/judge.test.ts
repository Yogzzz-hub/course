import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { challenges } from '../src/arena/challenges';
import { createGrader, GradingInputError, type GraderOptions } from '../judge/grader';
import { hiddenChallenges } from '../judge/bank/hidden';
import { pythonAdapter } from '../judge/languages/python';
import { createTrustedLocalPythonAdapter } from '../judge/adapters/trustedLocal';
import { createJudge0Adapter, mapJudge0Status, verifyJudge0Config } from '../judge/adapters/judge0';
import { RateLimiter, Semaphore } from '../judge/limits';
import { ForbiddenError, UnauthenticatedError } from '../src/admin-console/permissions';
import type { ExecutionAdapter, ExecutionRequest, ExecutionResult } from '../judge/types';
import { python } from './helpers/runtimes';

const student = { id: 'student-1', role: null };
const otherStudent = { id: 'student-2', role: null };
const instructor = { id: 'staff-1', role: 'instructor' as const };
const analyst = { id: 'staff-2', role: 'analyst' as const };
let keyCounter = 0;
const request = (challengeId: string, source: string, extra: Record<string, unknown> = {}) => ({ challengeId, challengeVersion: 1, language: 'python', source, mode: 'independent', declaredAiUse: false, idempotencyKey: `key-${++keyCounter}-abcdef`, ...extra });
const graderWith = (executor: ExecutionAdapter, options: Partial<GraderOptions> = {}) => createGrader({ executor, language: pythonAdapter, challenges, hidden: hiddenChallenges, sleep: async () => {}, ...options });

describe('challenge bank integrity', () => {
  it('pairs every public challenge with hidden tests, a reference and at least two faulty solutions', () => {
    for (const challenge of challenges) {
      const secret = hiddenChallenges.find(item => item.challengeId === challenge.id && item.version === challenge.version);
      expect(secret, challenge.id).toBeDefined();
      expect(secret!.faulty.length, challenge.id).toBeGreaterThanOrEqual(2);
      expect(secret!.tests.some(test => test.tags.some(tag => ['edge', 'boundary', 'invalid'].includes(tag))), challenge.id).toBe(true);
      expect(Object.values(challenge.rubric).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });
  it('never imports server-only judging code into the browser source', () => {
    const files: string[] = [];
    const walk = (dir: string) => readdirSync(dir).forEach(name => { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (/\.(ts|tsx)$/.test(name)) files.push(path); });
    walk('src');
    for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(/from ['"][./]*judge\//);
  });
});

describe.skipIf(!python)('grader validation with trusted reference and faulty solutions', () => {
  const executor = createTrustedLocalPythonAdapter({ python: python ?? ['python'], acknowledge: 'trusted-repository-code-only' });
  const grader = graderWith(executor, { concurrency: 4 });

  it.each(hiddenChallenges.map(item => [item.challengeId, item] as const))('%s: the reference passes every test', async (_id, secret) => {
    const result = await grader.submit(request(secret.challengeId, secret.reference), student);
    const failures = [...result.publicCases.filter(item => item.verdict !== 'passed').map(item => item.id), ...Object.entries(result.hidden.byTag).filter(([, tally]) => tally.passed !== tally.total).map(([tag]) => tag)];
    expect(failures).toEqual([]);
    expect(result.state).toBe('graded');
    expect(result.hidden.passed).toBe(result.hidden.total);
    expect(result.score).toMatchObject({ correctness: 100, edge: 100, understanding: null, quality: null, total: 100, assessedWeight: 80 });
  }, 60_000);

  it.each(hiddenChallenges.flatMap(item => item.faulty.map(faulty => [`${item.challengeId} / ${faulty.name}`, item.challengeId, faulty.source] as const)))('%s fails when its defect is exercised', async (_label, challengeId, source) => {
    const result = await grader.submit(request(challengeId, source), student);
    expect(result.state).toBe('graded');
    const failedPublic = result.publicCases.filter(item => item.verdict !== 'passed').length;
    expect(failedPublic + (result.hidden.total - result.hidden.passed)).toBeGreaterThan(0);
    expect(result.score.total).toBeLessThan(100);
  }, 60_000);

  it('accepts a different correct approach, not just the reference', async () => {
    const alternative = 'def second_largest(nums):\n    top = None\n    second = None\n    for n in nums:\n        if top is None or n > top:\n            top, second = n, top\n        elif n != top and (second is None or n > second):\n            second = n\n    return second\n';
    const result = await grader.submit(request('second-largest', alternative), student);
    expect(result.score.total).toBe(100);
  }, 60_000);

  it('reports an infinite loop as a time limit, not a judging error', async () => {
    const result = await grader.submit(request('fizzbuzz', 'def fizzbuzz(n):\n    while True:\n        pass\n'), student);
    expect(result.state).toBe('graded');
    expect(result.publicCases.every(item => item.verdict === 'time_limit')).toBe(true);
    expect(result.score.total).toBe(0);
  }, 60_000);

  it('reports compilation and runtime errors as candidate failures', async () => {
    const syntax = await grader.submit(request('palindrome', 'def is_palindrome(text)\n    return True\n'), student);
    expect(syntax.compileError).toMatch(/SyntaxError/);
    expect(syntax.publicCases.every(item => item.verdict === 'compile_error')).toBe(true);
    const crash = await grader.submit(request('palindrome', 'def is_palindrome(text):\n    return text[10 ** 9]\n'), student);
    expect(crash.publicCases.every(item => item.verdict === 'runtime_error')).toBe(true);
    const missing = await grader.submit(request('palindrome', 'def something_else(text):\n    return True\n'), student);
    expect(missing.compileError).toMatch(/is_palindrome/);
  }, 60_000);

  it('stops runaway output at the output limit', async () => {
    const result = await grader.submit(request('fizzbuzz', 'print("x" * 10_000_000)\ndef fizzbuzz(n):\n    return []\n'), student);
    expect(result.state).toBe('graded');
    expect(result.score.total).toBe(0);
  }, 60_000);

  it('never returns hidden inputs or expected values to the candidate', async () => {
    const result = await grader.submit(request('palindrome', 'def is_palindrome(text):\n    return False\n'), student);
    const body = JSON.stringify(result);
    expect(body).not.toContain('Nixon');
    expect(body).not.toContain('Was it a car');
    expect(result.publicCases.map(item => item.id)).toEqual(['ex1', 'ex2', 'ex3']);
  }, 60_000);

  it('folds the understanding check into the score using the rubric', async () => {
    const secret = hiddenChallenges.find(item => item.challengeId === 'paginate')!;
    const result = await grader.submit(request('paginate', secret.reference), student);
    const updated = grader.recordUnderstanding(result.submissionId, student, { correct: 1, total: 2 });
    expect(updated.score).toMatchObject({ understanding: 50, assessedWeight: 95 });
    expect(updated.score.total).toBeCloseTo((100 * 60 + 100 * 20 + 50 * 15) / 95, 1);
    expect(() => grader.recordUnderstanding(result.submissionId, otherStudent, { correct: 2, total: 2 })).toThrow(GradingInputError);
  }, 60_000);
});

/** Scripted executors for infrastructure behaviour. */
function scripted(responses: (ExecutionResult | Error)[], onCall?: (request: ExecutionRequest) => void): ExecutionAdapter & { calls: number } {
  const adapter = {
    name: 'scripted', acceptsUntrustedCode: true, calls: 0,
    async execute(executionRequest: ExecutionRequest) {
      onCall?.(executionRequest);
      const next = responses[Math.min(adapter.calls++, responses.length - 1)];
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return adapter;
}
const outage: ExecutionResult = { status: 'infrastructure_error', stdout: '', stderr: '', message: 'connection refused' };

describe('grading infrastructure', () => {
  it('reports an execution-service outage as a judging error after retrying', async () => {
    const executor = scripted([outage]);
    const grader = graderWith(executor, { retries: 2 });
    const result = await grader.submit(request('paginate', 'def is_palindrome(t):\n    return True\n'), student);
    expect(result.state).toBe('judge_error');
    expect(result.attempts).toBe(3);
    expect(result.score.total).toBeNull();
    expect(result.judgeError).toMatch(/not a problem with your code/);
    expect(grader.audit(result.submissionId, instructor).filter(entry => entry.action === 'retry')).toHaveLength(2);
  });
  it('recovers from a transient failure and can rejudge later', async () => {
    let token = '';
    const executor = scripted([outage, new Error('socket hang up'), { status: 'ok', stdout: '', stderr: '' }], call => { token = call.program.match(/_TOKEN = "([^"]+)"/)![1]; });
    const grader = graderWith(executor, { retries: 2, token: () => 'TOKEN123' });
    const result = await grader.submit(request('paginate', 'def is_palindrome(t):\n    return True\n'), student);
    expect(token).toBe('TOKEN123');
    expect(result.state).toBe('graded');
    expect(result.attempts).toBe(3);
    await expect(grader.rejudge(result.submissionId, student)).rejects.toBeInstanceOf(ForbiddenError);
    const again = await grader.rejudge(result.submissionId, instructor);
    expect(again.state).toBe('graded');
    expect(grader.audit(result.submissionId, instructor).map(entry => entry.action)).toContain('rejudged');
  });
  it('processes a repeated idempotency key once', async () => {
    const executor = scripted([{ status: 'ok', stdout: '', stderr: '' }]);
    const grader = graderWith(executor);
    const body = request('paginate', 'def fizzbuzz(n):\n    return []\n');
    const first = await grader.submit(body, student);
    const second = await grader.submit(body, student);
    expect(second.submissionId).toBe(first.submissionId);
    expect(executor.calls).toBe(1);
  });
  it('limits concurrent executions under load', async () => {
    let running = 0, peak = 0;
    const executor: ExecutionAdapter = { name: 'slow', acceptsUntrustedCode: true, async execute() { running++; peak = Math.max(peak, running); await new Promise(resolve => setTimeout(resolve, 20)); running--; return { status: 'ok', stdout: '', stderr: '' }; } };
    const grader = graderWith(executor, { concurrency: 2 });
    const results = await Promise.all(Array.from({ length: 8 }, (_, index) => grader.submit(request('paginate', `def fizzbuzz(n):\n    return [${index}]\n`), { id: `user-${index}` })));
    expect(results.every(result => result.state === 'graded')).toBe(true);
    expect(peak).toBe(2);
  });
  it('rejects unauthenticated, malformed and oversized submissions and ignores forged scores', async () => {
    const executor = scripted([{ status: 'ok', stdout: '', stderr: '' }]);
    const grader = graderWith(executor);
    await expect(grader.submit(request('paginate', 'x'), null)).rejects.toThrow(/Sign in/);
    await expect(grader.submit({ ...request('paginate', 'x'), challengeId: '../etc' }, student)).rejects.toBeInstanceOf(GradingInputError);
    await expect(grader.submit(request('paginate', 'x'.repeat(20_001)), student)).rejects.toThrow(/20,000/);
    await expect(grader.submit(request('no-such-challenge', 'x'), student)).rejects.toThrow(/not available/);
    const forged = await grader.submit(request('paginate', 'def fizzbuzz(n):\n    return []\n', { score: { total: 100 }, state: 'graded', correctness: 100 }), student);
    expect(forged.score.total).toBe(0);
  });
  it('keeps each submission private to its owner and authorised staff', async () => {
    const grader = graderWith(scripted([{ status: 'ok', stdout: '', stderr: '' }]));
    const result = await grader.submit(request('paginate', 'def fizzbuzz(n):\n    return []\n'), student);
    expect(grader.get(result.submissionId, student).submissionId).toBe(result.submissionId);
    expect(() => grader.get(result.submissionId, otherStudent)).toThrow(ForbiddenError);
    expect(() => grader.get(result.submissionId, null)).toThrow(UnauthenticatedError);
    expect(grader.get(result.submissionId, instructor).submissionId).toBe(result.submissionId);
  });
  it('lets authorised staff correct a score with a recorded reason', async () => {
    const grader = graderWith(scripted([{ status: 'ok', stdout: '', stderr: '' }]));
    const result = await grader.submit(request('paginate', 'def fizzbuzz(n):\n    return []\n'), student);
    expect(() => grader.correct(result.submissionId, analyst, { total: 90, reason: 'Hidden test 3 was wrong' })).toThrow(ForbiddenError);
    expect(() => grader.correct(result.submissionId, instructor, { total: 90, reason: 'short' })).toThrow(/10 characters/);
    expect(() => grader.correct(result.submissionId, instructor, { total: 150, reason: 'Hidden test 3 was wrong' })).toThrow(/between 0 and 100/);
    const corrected = grader.correct(result.submissionId, instructor, { total: 90, reason: 'Hidden test 3 had a wrong expected value' });
    expect(corrected).toMatchObject({ correctedBy: 'staff-1', score: { total: 90 } });
    expect(grader.audit(result.submissionId, instructor).at(-1)).toMatchObject({ action: 'corrected', actor: 'staff-1' });
  });
});

describe('Judge0 adapter', () => {
  it('maps Judge0 statuses', () => {
    expect(mapJudge0Status(3)).toBe('ok');
    expect(mapJudge0Status(5)).toBe('time_limit');
    expect(mapJudge0Status(6)).toBe('compile_error');
    expect(mapJudge0Status(11)).toBe('runtime_error');
    expect(mapJudge0Status(7, 'Runtime Error (SIGKILL)')).toBe('memory_limit');
    expect(mapJudge0Status(13)).toBe('infrastructure_error');
  });
  it('sends strict, network-free limits and treats service errors as infrastructure failures', async () => {
    let sent: Record<string, unknown> = {};
    let headers: Record<string, string> = {};
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body)); headers = init.headers as Record<string, string>;
      return new Response(JSON.stringify({ status: { id: 3 }, stdout: Buffer.from('hello').toString('base64') }), { status: 201 });
    }) as unknown as typeof fetch;
    const adapter = createJudge0Adapter({ baseUrl: 'https://judge.internal', authToken: 'server-secret', fetchImpl });
    const result = await adapter.execute({ language: 'python', program: 'print(1)', stdin: '', limits: { cpuMs: 2000, wallMs: 5000, memoryKb: 128000, outputKb: 64 } });
    expect(result).toMatchObject({ status: 'ok', stdout: 'hello' });
    expect(sent).toMatchObject({ enable_network: false, max_processes_and_or_threads: 1, cpu_time_limit: 2, wall_time_limit: 5, memory_limit: 128000 });
    expect(headers['X-Auth-Token']).toBe('server-secret');
    const down = createJudge0Adapter({ baseUrl: 'https://judge.internal', fetchImpl: (async () => new Response('busy', { status: 503 })) as unknown as typeof fetch });
    expect((await down.execute({ language: 'python', program: '', stdin: '', limits: { cpuMs: 1, wallMs: 1, memoryKb: 1, outputKb: 1 } })).status).toBe('infrastructure_error');
  });
  it('flags an unsafe sandbox configuration', async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ enable_network: true, allow_enable_network: true, max_cpu_time_limit: 15, max_memory_limit: 512000 }))) as unknown as typeof fetch;
    const issues = await verifyJudge0Config({ baseUrl: 'https://judge.internal', fetchImpl });
    expect(issues.length).toBe(4);
    const safe = (async () => new Response(JSON.stringify({ enable_network: false, allow_enable_network: false, max_cpu_time_limit: 5, max_memory_limit: 256000, max_max_processes_and_or_threads: 60 }))) as unknown as typeof fetch;
    expect(await verifyJudge0Config({ baseUrl: 'https://judge.internal', fetchImpl: safe })).toEqual([]);
  });
  it('refuses to use the local runner for visitor code in production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try { expect(() => createTrustedLocalPythonAdapter({ python: ['python'], acknowledge: 'trusted-repository-code-only' })).toThrow(/never be used in production/); }
    finally { process.env.NODE_ENV = previous; }
  });
});

describe('limits', () => {
  it('rate-limits per key and refills over time', () => {
    let time = 0;
    const limiter = new RateLimiter(3, 6, () => time);
    expect([1, 2, 3].map(() => limiter.take('ip-1').allowed)).toEqual([true, true, true]);
    expect(limiter.take('ip-1')).toMatchObject({ allowed: false });
    expect(limiter.take('ip-2').allowed).toBe(true);
    time += 10_000;
    expect(limiter.take('ip-1').allowed).toBe(true);
  });
  it('queues work beyond the concurrency cap', async () => {
    const semaphore = new Semaphore(1);
    const order: number[] = [];
    await Promise.all([1, 2, 3].map(index => semaphore.use(async () => { order.push(index); await new Promise(resolve => setTimeout(resolve, 5)); })));
    expect(order).toEqual([1, 2, 3]);
  });
});
