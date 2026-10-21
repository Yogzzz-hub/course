import type { TestTag } from '../src/arena/contracts';

/**
 * Server-side judging types. Nothing under /judge is imported by the browser bundle:
 * hidden tests, reference solutions and execution credentials stay on the server.
 */
export type ExecutionStatus = 'ok' | 'runtime_error' | 'compile_error' | 'time_limit' | 'memory_limit' | 'output_limit' | 'infrastructure_error';
export interface ExecutionLimits { cpuMs: number; wallMs: number; memoryKb: number; outputKb: number }
export interface ExecutionRequest { language: 'python'; program: string; stdin: string; limits: ExecutionLimits }
export interface ExecutionResult { status: ExecutionStatus; stdout: string; stderr: string; timeMs?: number; memoryKb?: number; message?: string }

/** Runs a program somewhere isolated. Implementations: Judge0 (production) and a trusted-code test runner. */
export interface ExecutionAdapter {
  readonly name: string;
  /** False for any adapter that must never receive visitor code. */
  readonly acceptsUntrustedCode: boolean;
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}

export interface CaseInput { id: string; args: unknown[] }
export type CaseReport = { id: string; ok: true; value: unknown } | { id: string; ok: false; error: string; message?: string };
export type FatalReport = { fatal: 'compile' | 'load' | 'missing'; error: string; message: string };

/** Wraps a candidate function in a test harness for one language. Add a new language by adding an adapter. */
export interface LanguageAdapter {
  readonly language: 'python';
  buildProgram(source: string, functionName: string, token: string): string;
  parseOutput(stdout: string, token: string): { cases: CaseReport[]; fatal?: FatalReport };
}

export type Expectation = { value: unknown } | { error: string };
export interface HiddenTest { id: string; args: unknown[]; expect: Expectation; tags: TestTag[] }
export interface HiddenChallenge {
  challengeId: string;
  version: number;
  tests: HiddenTest[];
  /** Randomised inputs; expected values come from running the reference solution on them. */
  property?: { count: number; seed: number; generate: (random: () => number) => unknown[] };
  reference: string;
  /** Deliberately wrong solutions used to prove the tests catch real defects. */
  faulty: { name: string; source: string; defect: string }[];
}
