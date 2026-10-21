import { describe, expect, it } from 'vitest';
import { answerCurrent, createAttempt, currentQuestion, findQuestion, type Attempt } from '../src/assessment/engine';
import { questionBank } from '../src/assessment/questionBank';
import { scoreAttempt, summarise, type SkillResult } from '../src/assessment/results';
import { focusAreas } from '../src/assessment/skills';

const now = new Date('2026-10-21T10:00:00Z');
function play(attempt: Attempt, pickCorrect: (index: number) => boolean) {
  let state = attempt;
  let index = 0;
  while (state.status === 'in_progress') {
    const current = currentQuestion(state)!;
    const question = findQuestion(questionBank, current)!;
    const wrong = question.options.find(option => option.id !== question.answer)!.id;
    state = answerCurrent(state, pickCorrect(index++) ? question.answer : wrong, questionBank, now);
  }
  return state;
}

describe('adaptive engine', () => {
  it('is deterministic for a seed', () => {
    const a = play(createAttempt({ track: 'intermediate', focus: 'core', seed: 42, now }), i => i % 2 === 0);
    const b = play(createAttempt({ track: 'intermediate', focus: 'core', seed: 42, now }), i => i % 2 === 0);
    expect(a.asked.map(item => item.id)).toEqual(b.asked.map(item => item.id));
    expect(a.asked.map(item => item.optionOrder)).toEqual(b.asked.map(item => item.optionOrder));
  });
  it('asks the configured number of questions without repeats, within focus skills', () => {
    for (const focus of focusAreas) {
      const done = play(createAttempt({ track: 'beginner', focus: focus.id, seed: 7, now }), () => true);
      expect(done.asked).toHaveLength(10);
      expect(new Set(done.asked.map(item => item.id)).size).toBe(10);
      expect(done.asked.every(item => (focus.skills as string[]).includes(item.skill))).toBe(true);
      expect(done.status).toBe('completed');
      expect(done.finishedAt).toBe(now.toISOString());
    }
  });
  it('clamps length to 8–12', () => {
    expect(createAttempt({ track: 'beginner', focus: 'core', length: 3, seed: 1 }).length).toBe(8);
    expect(createAttempt({ track: 'beginner', focus: 'core', length: 50, seed: 1 }).length).toBe(12);
  });
  it('raises difficulty after correct answers and lowers it after wrong ones', () => {
    const up = play(createAttempt({ track: 'beginner', focus: 'core', seed: 3, now }), () => true);
    expect(up.asked[0].difficulty).toBe(1);
    expect(up.asked.slice(-4).every(item => item.difficulty === 3)).toBe(true);
    const down = play(createAttempt({ track: 'advanced', focus: 'core', seed: 3, now }), () => false);
    expect(down.asked[0].difficulty).toBe(3);
    expect(down.asked.slice(-4).every(item => item.difficulty === 1)).toBe(true);
  });
  it('shuffles options but keeps every option exactly once', () => {
    const attempt = createAttempt({ track: 'beginner', focus: 'core', seed: 99 });
    const question = findQuestion(questionBank, attempt.asked[0])!;
    expect([...attempt.asked[0].optionOrder].sort()).toEqual(question.options.map(option => option.id).sort());
  });
  it('rejects answers that do not belong to the current question', () => {
    const attempt = createAttempt({ track: 'beginner', focus: 'core', seed: 5 });
    expect(() => answerCurrent(attempt, 'z')).toThrow();
  });
});

describe('truthful scoring', () => {
  it('scores all-correct attempts at 100% and all-wrong at 0%', () => {
    const perfect = scoreAttempt(play(createAttempt({ track: 'intermediate', focus: 'backend', seed: 11, now }), () => true));
    expect(perfect.total.percent).toBe(100);
    expect(perfect.total.correct).toBe(10);
    expect(perfect.gaps).toEqual([]);
    const none = scoreAttempt(play(createAttempt({ track: 'intermediate', focus: 'backend', seed: 11, now }), () => false));
    expect(none.total.percent).toBe(0);
    expect(none.band).toBe('early');
  });
  it('weights points by difficulty and reports exact counts', () => {
    const attempt = play(createAttempt({ track: 'beginner', focus: 'core', seed: 21, now }), i => i < 5);
    const result = scoreAttempt(attempt);
    const earned = attempt.asked.filter(item => item.correct).reduce((sum, item) => sum + item.difficulty, 0);
    const possible = attempt.asked.reduce((sum, item) => sum + item.difficulty, 0);
    expect(result.total).toMatchObject({ asked: 10, correct: 5, earned, possible, percent: Math.round((earned / possible) * 100) });
    expect(result.skills.reduce((sum, item) => sum + item.asked, 0)).toBe(10);
  });
  it('marks a skill with one question as not enough evidence', () => {
    const result = scoreAttempt(play(createAttempt({ track: 'beginner', focus: 'fullstack', seed: 2, now }), () => true));
    for (const skill of result.skills) expect(skill.level === 'insufficient').toBe(skill.asked < 2);
  });
  it('recommends only real catalogue modules for missed questions', () => {
    const result = scoreAttempt(play(createAttempt({ track: 'beginner', focus: 'backend', seed: 8, now }), () => false));
    expect(result.recommendations.length).toBeGreaterThan(0);
    for (const recommendation of result.recommendations) expect(recommendation.slug).toMatch(/^\/programmes\//);
  });
  it('writes the summary from measured levels', () => {
    const results: SkillResult[] = [
      { skill: 'python', asked: 3, correct: 2, earned: 3, possible: 6, percent: 50, level: 'working' },
      { skill: 'sql', asked: 2, correct: 0, earned: 0, possible: 3, percent: 0, level: 'developing' },
      { skill: 'apis', asked: 2, correct: 0, earned: 0, possible: 3, percent: 0, level: 'developing' },
      { skill: 'web', asked: 1, correct: 1, earned: 1, possible: 1, percent: 100, level: 'insufficient' },
    ];
    expect(summarise(results)).toBe('Your Python fundamentals are solid. Your answers suggest that database queries and API development need additional practice. There were too few questions on web fundamentals to judge it.');
  });
});

describe('skill levels', () => {
  it('needs both points and correct answers to rate a skill', async () => {
    const { scoreAttempt: score } = await import('../src/assessment/results');
    const { questionBank: bank } = await import('../src/assessment/questionBank');
    const easy = bank.find(question => question.skill === 'javascript' && question.difficulty === 1)!;
    const hard = bank.find(question => question.skill === 'javascript' && question.difficulty === 3)!;
    const wrong = easy.options.find(option => option.id !== easy.answer)!.id;
    const attempt = { id: 'a', bankVersion: '2026.10.1', seed: 1, track: 'beginner' as const, focus: 'core' as const, length: 8, startedAt: '', status: 'completed' as const, target: 1 as const,
      asked: [{ id: easy.id, version: 1, skill: easy.skill, difficulty: easy.difficulty, optionOrder: easy.options.map(o => o.id), selected: wrong, correct: false }, { id: hard.id, version: 1, skill: hard.skill, difficulty: hard.difficulty, optionOrder: hard.options.map(o => o.id), selected: hard.answer, correct: true }] };
    const javascript = score(attempt).skills.find(item => item.skill === 'javascript')!;
    expect(javascript.percent).toBe(75);
    expect(javascript.level).toBe('developing');
  });
});
