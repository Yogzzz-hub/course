import { describe, expect, it } from 'vitest';
import { countedResults, periodStart, pointsFor, pseudonymFor, rankings, type Participant, type VerifiedResult } from '../src/leaderboard/scoring';

const now = new Date('2026-10-21T12:00:00Z');
let n = 0;
const result = (userId: string, challengeId: string, total: number, extra: Partial<VerifiedResult> = {}): VerifiedResult => ({ userId, submissionId: `s${++n}`, challengeId, difficulty: 2, skills: ['python'], total, understanding: null, gradedAt: '2026-10-20T10:00:00Z', verified: true, ...extra });
const people: Participant[] = [{ userId: 'a', pseudonym: 'Quiet Falcon 11', optedIn: true }, { userId: 'b', pseudonym: 'Bright Otter 12', optedIn: true }, { userId: 'c', pseudonym: 'Calm Lynx 13', optedIn: false }];

describe('leaderboard scoring', () => {
  it('weights difficulty and adds at most 25% for understanding', () => {
    expect(pointsFor({ difficulty: 1, total: 100, understanding: null })).toBe(10);
    expect(pointsFor({ difficulty: 3, total: 100, understanding: 100 })).toBe(37.5);
    expect(pointsFor({ difficulty: 2, total: 50, understanding: 50 })).toBe(12.5);
    expect(pointsFor({ difficulty: 2, total: 150, understanding: -5 })).toBe(20);
  });
  it('counts only the best verified attempt per challenge, so repeated submissions cannot farm points', () => {
    const results = [result('a', 'x', 40), result('a', 'x', 90), result('a', 'x', 90, { gradedAt: '2026-10-20T11:00:00Z' }), result('a', 'x', 100, { verified: false })];
    const counted = countedResults(results, new Date(0), now);
    expect(counted).toHaveLength(1);
    expect(counted[0].total).toBe(90);
    expect(counted[0].gradedAt).toBe('2026-10-20T10:00:00Z');
  });
  it('excludes people who did not opt in and filters by period, level and skill', () => {
    const results = [result('a', 'x', 100), result('c', 'x', 100), result('b', 'y', 100, { gradedAt: '2026-09-01T00:00:00Z', difficulty: 3, skills: ['sql'] })];
    expect(rankings(results, people, { period: 'week', now }).map(item => item.userId)).toEqual(['a']);
    expect(rankings(results, people, { period: 'all', now }).map(item => item.userId)).toEqual(['b', 'a']);
    expect(rankings(results, people, { period: 'all', now, difficulty: 3 }).map(item => item.userId)).toEqual(['b']);
    expect(rankings(results, people, { period: 'all', now, skill: 'python' }).map(item => item.userId)).toEqual(['a']);
  });
  it('breaks ties by challenges, then by who reached the total first', () => {
    const results = [result('a', 'x', 50), result('a', 'y', 50, { gradedAt: '2026-10-20T12:00:00Z' }), result('b', 'z', 100, { gradedAt: '2026-10-20T09:00:00Z' })];
    expect(rankings(results, people, { period: 'all', now }).map(item => [item.userId, item.points])).toEqual([['a', 20], ['b', 20]]);
    const sameCount = [result('a', 'x', 100, { gradedAt: '2026-10-20T12:00:00Z' }), result('b', 'x', 100, { gradedAt: '2026-10-20T09:00:00Z' })];
    expect(rankings(sameCount, people, { period: 'all', now }).map(item => item.userId)).toEqual(['b', 'a']);
  });
  it('starts weeks on Monday and months on the 1st (UTC)', () => {
    expect(periodStart('week', now).toISOString()).toBe('2026-10-19T00:00:00.000Z');
    expect(periodStart('month', now).toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });
  it('awards badges from defined rules', () => {
    const results = [result('a', 'x', 100, { difficulty: 3, understanding: 100 })];
    expect(rankings(results, people, { period: 'all', now })[0].badges).toEqual(['First solve', 'Advanced solver']);
  });
  it('makes stable pseudonyms that contain no personal data', () => {
    expect(pseudonymFor('seed-1')).toBe(pseudonymFor('seed-1'));
    expect(pseudonymFor('seed-1')).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/);
  });
});
