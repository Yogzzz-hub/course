import { z } from 'zod';
import { moduleExists, skills } from './skills';
import type { Question } from './questionBank';

const option = z.object({ id: z.string().regex(/^[a-z]$/), text: z.string().trim().min(1).max(400) });
const check = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('review'), reviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ kind: z.literal('stdout') }),
  z.object({ kind: z.literal('exception'), name: z.string().regex(/^[A-Z]\w*(Error|Exception)$/) }),
  z.object({ kind: z.literal('completion'), template: z.string().includes('__BLANK__') }),
  z.object({ kind: z.literal('json') }),
]);

export const questionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,48}$/, 'Use lowercase letters, numbers and hyphens.'),
  version: z.number().int().positive(),
  status: z.enum(['draft', 'active', 'retired']),
  skill: z.enum(skills),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  kind: z.enum(['mcq', 'output', 'debug']),
  prompt: z.string().trim().min(10).max(400),
  code: z.object({ language: z.enum(['python', 'javascript', 'sql']), source: z.string().min(1).max(2000), fixture: z.literal('students').optional() }).optional(),
  options: z.array(option).min(2).max(6),
  codeOptions: z.boolean().optional(),
  answer: z.string(),
  explanation: z.string().trim().min(20).max(600),
  objective: z.string().trim().min(5).max(160),
  module: z.object({ programmeId: z.string(), module: z.string() }),
  points: z.number().int().min(1).max(5).optional(),
  shuffle: z.boolean().optional(),
  check,
}).superRefine((question, context) => {
  const ids = question.options.map(item => item.id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: ['options'], message: 'Option ids must be unique.' });
  const texts = question.options.map(item => item.text.trim());
  if (new Set(texts).size !== texts.length) context.addIssue({ code: 'custom', path: ['options'], message: 'Two options have the same text.' });
  if (!ids.includes(question.answer)) context.addIssue({ code: 'custom', path: ['answer'], message: 'The answer must be one of the option ids.' });
  if (!moduleExists(question.module)) context.addIssue({ code: 'custom', path: ['module'], message: `Module "${question.module.module}" is not in programme "${question.module.programmeId}".` });
  if ((question.check.kind === 'stdout' || question.check.kind === 'exception') && !question.code) context.addIssue({ code: 'custom', path: ['code'], message: 'Executable checks need code to run.' });
  if (question.code?.language === 'sql' && !question.code.fixture) context.addIssue({ code: 'custom', path: ['code', 'fixture'], message: 'SQL questions need a fixture.' });
});

export interface BankIssue { id: string; version?: number; path: string; message: string }

/** Structural validation for the whole bank. Executable answer checks run in the test suite. */
export function validateBank(bank: Question[]): BankIssue[] {
  const issues: BankIssue[] = [];
  const seen = new Set<string>();
  const active = new Set<string>();
  for (const question of bank) {
    const parsed = questionSchema.safeParse(question);
    if (!parsed.success) for (const issue of parsed.error.issues) issues.push({ id: question.id, version: question.version, path: issue.path.join('.'), message: issue.message });
    const key = `${question.id}@${question.version}`;
    if (seen.has(key)) issues.push({ id: question.id, version: question.version, path: 'version', message: 'Duplicate id and version.' });
    seen.add(key);
    if (question.status === 'active') {
      if (active.has(question.id)) issues.push({ id: question.id, path: 'status', message: 'Only one version of a question may be active.' });
      active.add(question.id);
    }
  }
  return issues;
}
