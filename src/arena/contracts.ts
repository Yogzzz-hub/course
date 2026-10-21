import { z } from 'zod';

/** The judging contract shared by the browser and the grading service. */
export const testTags = ['example', 'normal', 'edge', 'boundary', 'invalid', 'large', 'property', 'regression'] as const;
export type TestTag = typeof testTags[number];
export const edgeTags: TestTag[] = ['edge', 'boundary', 'invalid', 'regression'];

export const submissionStates = ['queued', 'running', 'graded', 'judge_error'] as const;
export type SubmissionState = typeof submissionStates[number];
export type CaseVerdict = 'passed' | 'wrong_answer' | 'runtime_error' | 'time_limit' | 'memory_limit' | 'compile_error' | 'not_run';
export type LearningMode = 'assisted' | 'independent';

export const submissionRequestSchema = z.object({
  challengeId: z.string().regex(/^[a-z0-9-]{2,48}$/),
  challengeVersion: z.number().int().positive(),
  language: z.literal('python'),
  source: z.string().min(1, 'Write some code first.').max(20_000, 'Keep submissions under 20,000 characters.'),
  mode: z.enum(['assisted', 'independent']),
  declaredAiUse: z.boolean(),
  idempotencyKey: z.string().min(8).max(80),
});
export type SubmissionRequest = z.infer<typeof submissionRequestSchema>;

export const publicCaseSchema = z.object({ id: z.string(), verdict: z.enum(['passed', 'wrong_answer', 'runtime_error', 'time_limit', 'memory_limit', 'compile_error', 'not_run']), args: z.array(z.unknown()), expected: z.unknown(), actual: z.unknown().optional(), error: z.string().optional() });
export const hiddenSummarySchema = z.object({ passed: z.number().int(), total: z.number().int(), byTag: z.record(z.string(), z.object({ passed: z.number().int(), total: z.number().int() })) });
export const scoreSchema = z.object({
  correctness: z.number().min(0).max(100).nullable(),
  edge: z.number().min(0).max(100).nullable(),
  understanding: z.number().min(0).max(100).nullable(),
  quality: z.number().min(0).max(100).nullable(),
  total: z.number().min(0).max(100).nullable(),
  assessedWeight: z.number().min(0).max(100),
});
export const submissionResultSchema = z.object({
  submissionId: z.string(),
  challengeId: z.string(),
  challengeVersion: z.number(),
  state: z.enum(submissionStates),
  graderVersion: z.string(),
  attempts: z.number().int(),
  publicCases: z.array(publicCaseSchema),
  hidden: hiddenSummarySchema,
  score: scoreSchema,
  compileError: z.string().optional(),
  judgeError: z.string().optional(),
  correctedBy: z.string().optional(),
  correctionReason: z.string().optional(),
  createdAt: z.string(),
  gradedAt: z.string().optional(),
});
export type PublicCase = z.infer<typeof publicCaseSchema>;
export type SubmissionResult = z.infer<typeof submissionResultSchema>;
export type ScoreBreakdown = z.infer<typeof scoreSchema>;

export const judgeStatusSchema = z.object({ available: z.boolean(), languages: z.array(z.string()), message: z.string().optional() });
export type JudgeStatus = z.infer<typeof judgeStatusSchema>;
