import { hashString } from '../assessment/engine';
import type { Difficulty, Skill } from '../assessment/skills';

/**
 * Leaderboard rules. Only server-graded submissions count, each learner's best attempt per
 * challenge counts once per period, and every score change is expected to arrive with an audit
 * record from the grader. Public names are pseudonyms and taking part is opt-in.
 */
export const SCORING_VERSION = 'leaderboard-2026.10.1';
export const basePoints: Record<Difficulty, number> = { 1: 10, 2: 20, 3: 30 };
export const UNDERSTANDING_BONUS = 0.25;

export interface VerifiedResult {
  userId: string;
  submissionId: string;
  challengeId: string;
  difficulty: Difficulty;
  skills: Skill[];
  /** Grader total, 0–100, after any audited correction. */
  total: number;
  /** Understanding-check score, 0–100, or null if not taken. */
  understanding: number | null;
  gradedAt: string;
  /** True only when the judging service graded it. Local practice is never verified. */
  verified: boolean;
}
export interface Participant { userId: string; pseudonym: string; optedIn: boolean }
export type Period = 'week' | 'month' | 'all';
export interface Standing { position: number; userId: string; pseudonym: string; points: number; challenges: number; reachedAt: string; badges: string[] }

/** Points for one result: difficulty × share of tests passed, plus up to 25% for the understanding check. */
export function pointsFor(result: Pick<VerifiedResult, 'difficulty' | 'total' | 'understanding'>) {
  const base = basePoints[result.difficulty];
  const correctness = Math.max(0, Math.min(100, result.total)) / 100;
  const understanding = result.understanding === null ? 0 : (Math.max(0, Math.min(100, result.understanding)) / 100) * UNDERSTANDING_BONUS;
  return Math.round(base * (correctness + understanding) * 10) / 10;
}

export function periodStart(period: Period, now: Date) {
  if (period === 'all') return new Date(0);
  const start = new Date(now);
  if (period === 'week') { const day = (start.getUTCDay() + 6) % 7; start.setUTCDate(start.getUTCDate() - day); }
  else start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/** Keeps each learner's best counted result per challenge; ties keep the earlier one. */
export function countedResults(results: VerifiedResult[], from: Date, to: Date) {
  const best = new Map<string, VerifiedResult>();
  for (const result of results) {
    const at = Date.parse(result.gradedAt);
    if (!result.verified || at < from.getTime() || at > to.getTime()) continue;
    const key = `${result.userId}:${result.challengeId}`;
    const current = best.get(key);
    if (!current || pointsFor(result) > pointsFor(current) || (pointsFor(result) === pointsFor(current) && at < Date.parse(current.gradedAt))) best.set(key, result);
  }
  return [...best.values()];
}

export const badgeRules: { id: string; label: string; description: string; earned: (results: VerifiedResult[]) => boolean }[] = [
  { id: 'first-solve', label: 'First solve', description: 'Passed every test on any challenge.', earned: results => results.some(item => item.total === 100) },
  { id: 'five-challenges', label: 'Five challenges', description: 'Counted results on five different challenges.', earned: results => new Set(results.map(item => item.challengeId)).size >= 5 },
  { id: 'advanced-solver', label: 'Advanced solver', description: 'Scored at least 80 on an advanced challenge.', earned: results => results.some(item => item.difficulty === 3 && item.total >= 80) },
  { id: 'explains-it', label: 'Explains it', description: 'Answered every understanding question correctly on three challenges.', earned: results => results.filter(item => item.understanding === 100).length >= 3 },
];

export function rankings(results: VerifiedResult[], participants: Participant[], options: { period: Period; now: Date; difficulty?: Difficulty; skill?: Skill; limit?: number }): Standing[] {
  const optedIn = new Map(participants.filter(item => item.optedIn).map(item => [item.userId, item]));
  const counted = countedResults(results, periodStart(options.period, options.now), options.now)
    .filter(item => optedIn.has(item.userId))
    .filter(item => !options.difficulty || item.difficulty === options.difficulty)
    .filter(item => !options.skill || item.skills.includes(options.skill));
  const byUser = new Map<string, VerifiedResult[]>();
  for (const item of counted) byUser.set(item.userId, [...(byUser.get(item.userId) ?? []), item]);
  const standings = [...byUser.entries()].map(([userId, items]) => ({
    userId,
    pseudonym: optedIn.get(userId)!.pseudonym,
    points: Math.round(items.reduce((sum, item) => sum + pointsFor(item), 0) * 10) / 10,
    challenges: items.length,
    reachedAt: items.map(item => item.gradedAt).sort().at(-1)!,
    badges: badgeRules.filter(rule => rule.earned(items)).map(rule => rule.label),
  }));
  // Tie-breaks: more points, then more distinct challenges, then whoever reached the total first, then name.
  standings.sort((a, b) => b.points - a.points || b.challenges - a.challenges || a.reachedAt.localeCompare(b.reachedAt) || a.pseudonym.localeCompare(b.pseudonym));
  return standings.slice(0, options.limit ?? 50).map((item, index) => ({ position: index + 1, ...item }));
}

const adjectives = ['Quiet', 'Bright', 'Steady', 'Curious', 'Swift', 'Patient', 'Bold', 'Calm', 'Keen', 'Clever'];
const nouns = ['Falcon', 'Otter', 'Comet', 'Cedar', 'Lynx', 'Harbor', 'Orbit', 'Maple', 'Heron', 'Quasar'];
/** A friendly pseudonym from a random seed. Never derived from a name or email. */
export function pseudonymFor(seed: string) {
  const hash = hashString(seed);
  return `${adjectives[hash % adjectives.length]} ${nouns[Math.floor(hash / 10) % nouns.length]} ${(hash % 90) + 10}`;
}
