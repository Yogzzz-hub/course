import { detailedProgrammes } from '../data/programmeCatalog';
import { findQuestion, type Attempt } from './engine';
import { pointsFor, questionBank, type Question } from './questionBank';
import { difficultyLabel, skillInfo, skills, type Difficulty, type Skill } from './skills';

export type SkillLevel = 'strong' | 'working' | 'developing' | 'insufficient';
export type Band = 'strong' | 'solid' | 'developing' | 'early';

export interface SkillResult {
  skill: Skill;
  asked: number;
  correct: number;
  earned: number;
  possible: number;
  /** Share of available points earned, 0–100. */
  percent: number;
  level: SkillLevel;
  hardestCorrect?: Difficulty;
}
export interface ReviewItem { question: Question; optionOrder: string[]; selected: string; correct: boolean }
export interface Recommendation { programmeId: string; programmeName: string; slug: string; modules: string[]; skills: Skill[]; reasons: string[] }
export interface AssessmentResult {
  attemptId: string;
  bankVersion: string;
  completedAt: string;
  total: { asked: number; correct: number; earned: number; possible: number; percent: number };
  band: Band;
  /** Difficulty the adaptive staircase settled on over the last three questions. */
  settledAt: Difficulty;
  skills: SkillResult[];
  strengths: Skill[];
  gaps: Skill[];
  review: ReviewItem[];
  recommendations: Recommendation[];
  summary: string;
}

export const levelLabel: Record<SkillLevel, string> = { strong: 'Strong', working: 'Solid', developing: 'Developing', insufficient: 'Not enough evidence' };
export const bandLabel: Record<Band, string> = { strong: 'Strong', solid: 'Solid', developing: 'Developing', early: 'Early stage' };

const percentOf = (earned: number, possible: number) => possible ? Math.round((earned / possible) * 100) : 0;
/**
 * A level needs both the share of points and the share of correct answers to clear the bar,
 * so one hard question answered correctly cannot outweigh an easier one that was missed.
 */
function levelFor(asked: number, correct: number, percent: number): SkillLevel {
  if (asked < 2) return 'insufficient';
  const share = Math.min(percent, Math.round((correct / asked) * 100));
  return share >= 75 ? 'strong' : share >= 60 ? 'working' : 'developing';
}
const bandFor = (percent: number): Band => percent >= 80 ? 'strong' : percent >= 60 ? 'solid' : percent >= 40 ? 'developing' : 'early';

export function listOf(items: string[]) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Writes the plain-language summary from the measured skill levels only. */
export function summarise(results: SkillResult[]) {
  const pick = (level: SkillLevel) => results.filter(item => item.level === level).map(item => skillInfo[item.skill]);
  const many = (group: ReturnType<typeof pick>) => group.length > 1 || group[0].plural;
  const parts: string[] = [];
  for (const [level, word] of [['strong', 'strong'], ['working', 'solid']] as const) {
    const group = pick(level);
    if (group.length) parts.push(`Your ${listOf(group.map(item => item.phrase))} ${many(group) ? 'are' : 'is'} ${word}.`);
  }
  const developing = pick('developing');
  if (developing.length) parts.push(`Your answers suggest that ${listOf(developing.map(item => item.phrase))} ${many(developing) ? 'need' : 'needs'} additional practice.`);
  const unknown = pick('insufficient');
  if (unknown.length) parts.push(`There were too few questions on ${listOf(unknown.map(item => item.phrase))} to judge ${unknown.length === 1 ? 'it' : 'them'}.`);
  return parts.join(' ');
}

/** Scores an attempt from the stored answers and the bank. Nothing is adjusted, curved or inferred. */
export function scoreAttempt(attempt: Attempt, bank: Question[] = questionBank): AssessmentResult {
  const answered = attempt.asked.filter(item => item.selected !== undefined);
  const review: ReviewItem[] = answered.map(item => {
    const question = findQuestion(bank, item);
    if (!question) throw new Error(`Question ${item.id} v${item.version} is missing from the bank.`);
    return { question, optionOrder: item.optionOrder, selected: item.selected!, correct: question.answer === item.selected };
  });
  const perSkill: SkillResult[] = skills.map(skill => {
    const items = review.filter(item => item.question.skill === skill);
    const possible = items.reduce((sum, item) => sum + pointsFor(item.question), 0);
    const earned = items.filter(item => item.correct).reduce((sum, item) => sum + pointsFor(item.question), 0);
    const percent = percentOf(earned, possible);
    const hardest = items.filter(item => item.correct).map(item => item.question.difficulty).sort().pop();
    const correct = items.filter(item => item.correct).length;
    return { skill, asked: items.length, correct, earned, possible, percent, level: levelFor(items.length, correct, percent), hardestCorrect: hardest };
  }).filter(item => item.asked > 0);
  const earned = perSkill.reduce((sum, item) => sum + item.earned, 0);
  const possible = perSkill.reduce((sum, item) => sum + item.possible, 0);
  const percent = percentOf(earned, possible);
  const lastThree = answered.slice(-3).map(item => item.difficulty);
  const settledAt = (lastThree.length ? Math.round(lastThree.reduce((a, b) => a + b, 0) / lastThree.length) : 1) as Difficulty;
  const strengths = perSkill.filter(item => item.level === 'strong' || item.level === 'working').sort((a, b) => b.percent - a.percent).map(item => item.skill);
  const gaps = perSkill.filter(item => item.level === 'developing').sort((a, b) => a.percent - b.percent).map(item => item.skill);
  return {
    attemptId: attempt.id,
    bankVersion: attempt.bankVersion,
    completedAt: attempt.finishedAt ?? new Date().toISOString(),
    total: { asked: answered.length, correct: review.filter(item => item.correct).length, earned, possible, percent },
    band: bandFor(percent),
    settledAt,
    skills: perSkill,
    strengths,
    gaps,
    review,
    recommendations: recommend(review, perSkill),
    summary: summarise(perSkill),
  };
}

/**
 * Course recommendations come from the modules behind missed questions, weakest skills first,
 * then from skills that were solid but not strong. Only real catalogue modules are named.
 */
export function recommend(review: ReviewItem[], perSkill: SkillResult[]): Recommendation[] {
  const byProgramme = new Map<string, Recommendation>();
  const add = (programmeId: string, module: string | null, skill: Skill, reason: string) => {
    const programme = detailedProgrammes.find(item => item.id === programmeId);
    if (!programme) return;
    const entry = byProgramme.get(programmeId) ?? { programmeId, programmeName: programme.name, slug: programme.slug, modules: [], skills: [], reasons: [] };
    if (module && !entry.modules.includes(module)) entry.modules.push(module);
    if (!entry.skills.includes(skill)) entry.skills.push(skill);
    if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
    byProgramme.set(programmeId, entry);
  };
  const ordered = [...perSkill].filter(item => item.level === 'developing' || item.level === 'working').sort((a, b) => a.percent - b.percent);
  for (const result of ordered) {
    const missed = review.filter(item => item.question.skill === result.skill && !item.correct);
    for (const item of missed) add(item.question.module.programmeId, item.question.module.module, result.skill, `${skillInfo[result.skill].label}: ${item.question.objective.replace(/\.$/, '')}`);
    if (!missed.length) add(skillInfo[result.skill].programmes[0], null, result.skill, `${skillInfo[result.skill].label}: build on a solid result`);
  }
  return [...byProgramme.values()].slice(0, 4);
}

export const difficultyText = (difficulty: Difficulty) => difficultyLabel[difficulty];
