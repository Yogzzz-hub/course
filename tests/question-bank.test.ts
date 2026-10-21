import { describe, expect, it } from 'vitest';
import { activeQuestions, questionBank, sqlFixtures, type Question } from '../src/assessment/questionBank';
import { validateBank } from '../src/assessment/schema';
import { skills } from '../src/assessment/skills';
import { python, runNode, runPython, runSql } from './helpers/runtimes';
import { allUnderstandingQuestions, understandingBank } from '../src/arena/understanding';
import { challenges } from '../src/arena/challenges';

const executable = [...questionBank, ...allUnderstandingQuestions()].filter(question => question.check.kind !== 'review');
const optionText = (question: Question, id: string) => question.options.find(option => option.id === id)!.text;

function execute(question: Question, source: string) {
  const language = question.code?.language;
  if (language === 'javascript') return runNode(source);
  if (language === 'sql') return runSql(sqlFixtures[question.code!.fixture!], source);
  return runPython(source);
}
function fill(template: string, line: string) {
  // Keep the indentation of the placeholder line.
  return template.replace(/^([ \t]*)__BLANK__/m, (_, indent: string) => `${indent}${line}`);
}

describe('question bank structure', () => {
  it('passes schema validation with no issues', () => {
    expect(validateBank(questionBank)).toEqual([]);
  });
  it('has active questions at every difficulty for every skill', () => {
    for (const skill of skills) for (const difficulty of [1, 2, 3]) {
      expect(activeQuestions().filter(question => question.skill === skill && question.difficulty === difficulty).length, `${skill} d${difficulty}`).toBeGreaterThan(0);
    }
  });
  it('catches a broken question', () => {
    const broken = { ...questionBank[0], id: 'Bad Id', answer: 'z', module: { programmeId: 'sql-postgresql', module: 'Not a module' } };
    const issues = validateBank([broken]).map(issue => issue.path);
    expect(issues).toEqual(expect.arrayContaining(['id', 'answer', 'module']));
  });
  it('validates every understanding-check question', () => {
    expect(validateBank(allUnderstandingQuestions())).toEqual([]);
    for (const challenge of challenges) expect(understandingBank[challenge.id]?.length ?? 0, challenge.id).toBeGreaterThanOrEqual(2);
  });
  it('rejects two active versions of the same question', () => {
    const issues = validateBank([questionBank[0], { ...questionBank[0], version: 2 }]);
    expect(issues.some(issue => issue.message.includes('Only one version'))).toBe(true);
  });
});

describe.skipIf(!python)('answer keys are verified by execution', () => {
  it.each(executable.map(question => [question.id, question] as const))('%s', (_id, question) => {
    const check = question.check;
    if (check.kind === 'stdout') {
      const result = execute(question, question.code!.source);
      expect(result.stderr, result.stderr).toBe('');
      expect(result.stdout).toBe(optionText(question, question.answer));
      // A distractor that equals the real output would make the question unanswerable.
      for (const option of question.options.filter(item => item.id !== question.answer)) expect(option.text).not.toBe(result.stdout);
    } else if (check.kind === 'exception') {
      const result = execute(question, question.code!.source);
      expect(result.status).not.toBe(0);
      expect(result.stderr.split('\n').pop()).toMatch(new RegExp(`^${check.name}\\b`));
      expect(optionText(question, question.answer)).toContain(check.name);
    } else if (check.kind === 'completion') {
      for (const option of question.options) {
        const result = execute(question, fill(check.template, option.text));
        if (option.id === question.answer) expect(result.stdout, `${option.text}\n${result.stderr}`).toBe('PASS');
        else expect(result.stdout, `distractor "${option.text}" must not pass`).not.toBe('PASS');
      }
    } else if (check.kind === 'json') {
      for (const option of question.options) {
        let valid = true;
        try { JSON.parse(option.text); } catch { valid = false; }
        expect(valid, option.text).toBe(option.id === question.answer);
      }
    }
  });
});
