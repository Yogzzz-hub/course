import { BANK_VERSION, activeQuestions, type Question } from './questionBank';
import { focusAreas, tracks, type Difficulty, type FocusId, type Skill, type TrackId } from './skills';

/** FNV-1a string hash and the mulberry32 generator: small, fast and deterministic. */
export function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffled<T>(items: readonly T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export interface AskedQuestion {
  id: string;
  version: number;
  skill: Skill;
  difficulty: Difficulty;
  optionOrder: string[];
  selected?: string;
  correct?: boolean;
  answeredAt?: string;
}
export interface Attempt {
  id: string;
  bankVersion: string;
  seed: number;
  track: TrackId;
  focus: FocusId;
  length: number;
  startedAt: string;
  finishedAt?: string;
  status: 'in_progress' | 'completed';
  /** Difficulty the next question will aim for. */
  target: Difficulty;
  asked: AskedQuestion[];
}

export const DEFAULT_LENGTH = 10;

const clampDifficulty = (value: number) => Math.min(3, Math.max(1, value)) as Difficulty;

export function createAttempt({ track, focus, seed = Math.floor(Math.random() * 2 ** 31), length = DEFAULT_LENGTH, now = new Date(), bank = activeQuestions(), id }: { track: TrackId; focus: FocusId; seed?: number; length?: number; now?: Date; bank?: Question[]; id?: string }): Attempt {
  const start = tracks.find(item => item.id === track)?.start ?? 1;
  const attempt: Attempt = { id: id ?? `att-${seed.toString(36)}-${now.getTime().toString(36)}`, bankVersion: BANK_VERSION, seed, track, focus, length: Math.min(12, Math.max(8, length)), startedAt: now.toISOString(), status: 'in_progress', target: start, asked: [] };
  return appendNext(attempt, bank);
}

export const findQuestion = (bank: Question[], ref: { id: string; version: number }) => bank.find(question => question.id === ref.id && question.version === ref.version);
export const currentQuestion = (attempt: Attempt) => attempt.status === 'in_progress' ? attempt.asked.find(item => item.selected === undefined) : undefined;

/** Picks the next question: rotate through the focus skills, aim for the target difficulty, never repeat. */
export function appendNext(attempt: Attempt, bank: Question[] = activeQuestions()): Attempt {
  if (attempt.asked.length >= attempt.length) return { ...attempt, status: 'completed', finishedAt: attempt.finishedAt };
  const random = seededRandom(hashString(`${attempt.seed}:${attempt.asked.length}`));
  const order = shuffled(focusAreas.find(item => item.id === attempt.focus)?.skills ?? [], seededRandom(attempt.seed));
  const used = new Set(attempt.asked.map(item => item.id));
  const pool = activeQuestions(bank).filter(question => !used.has(question.id));
  for (let offset = 0; offset < order.length; offset++) {
    const skill = order[(attempt.asked.length + offset) % order.length];
    const candidates = pool.filter(question => question.skill === skill);
    if (!candidates.length) continue;
    const ranked = candidates.map(question => ({ question, distance: Math.abs(question.difficulty - attempt.target), tie: random() })).sort((a, b) => a.distance - b.distance || a.tie - b.tie);
    const question = ranked[0].question;
    const ids = question.options.map(item => item.id);
    const optionOrder = question.shuffle === false ? ids : shuffled(ids, random);
    return { ...attempt, asked: [...attempt.asked, { id: question.id, version: question.version, skill: question.skill, difficulty: question.difficulty, optionOrder }] };
  }
  // The bank ran out of unused questions for every focus skill: finish early rather than repeat.
  return { ...attempt, length: attempt.asked.length, status: 'completed', finishedAt: attempt.finishedAt };
}

/** Records an answer, adapts the difficulty staircase and moves to the next question or completes. */
export function answerCurrent(attempt: Attempt, optionId: string, bank: Question[] = activeQuestions(), now = new Date()): Attempt {
  const current = currentQuestion(attempt);
  if (!current) throw new Error('There is no unanswered question in this attempt.');
  if (!current.optionOrder.includes(optionId)) throw new Error('That option does not belong to this question.');
  const question = findQuestion(bank, current);
  if (!question) throw new Error(`Question ${current.id} v${current.version} is not in the bank.`);
  const correct = question.answer === optionId;
  const asked = attempt.asked.map(item => item === current ? { ...item, selected: optionId, correct, answeredAt: now.toISOString() } : item);
  const next: Attempt = { ...attempt, asked, target: clampDifficulty(attempt.target + (correct ? 1 : -1)) };
  if (asked.length >= attempt.length) return { ...next, status: 'completed', finishedAt: now.toISOString() };
  const appended = appendNext(next, bank);
  return appended.status === 'completed' ? { ...appended, finishedAt: now.toISOString() } : appended;
}
