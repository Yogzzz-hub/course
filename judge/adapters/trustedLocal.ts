import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExecutionAdapter, ExecutionResult } from '../types';

/**
 * Runs Python on this machine for the test suite only, to validate the repository's own
 * reference and faulty solutions. It provides no isolation, so it refuses to start in
 * production and marks itself as unable to accept visitor code.
 */
export function createTrustedLocalPythonAdapter({ python, acknowledge }: { python: string[]; acknowledge: 'trusted-repository-code-only' }): ExecutionAdapter {
  if (acknowledge !== 'trusted-repository-code-only') throw new Error('The local runner is for trusted repository code only.');
  if (process.env.NODE_ENV === 'production') throw new Error('The local runner must never be used in production.');
  return {
    name: 'trusted-local-python',
    acceptsUntrustedCode: false,
    async execute({ program, stdin, limits }): Promise<ExecutionResult> {
      const directory = await mkdtemp(join(tmpdir(), 'aintrix-judge-'));
      const file = join(directory, 'main.py');
      await writeFile(file, program, 'utf8');
      const started = Date.now();
      try {
        return await new Promise<ExecutionResult>(resolve => {
          const child = spawn(python[0], [...python.slice(1), '-I', file], { cwd: directory, env: { PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1', PATH: process.env.PATH ?? '', SYSTEMROOT: process.env.SYSTEMROOT ?? '' } });
          let stdout = '', stderr = '', settled = false, overflow = false;
          const finish = (result: ExecutionResult) => { if (settled) return; settled = true; clearTimeout(timer); resolve({ ...result, timeMs: Date.now() - started }); };
          const timer = setTimeout(() => { child.kill('SIGKILL'); finish({ status: 'time_limit', stdout, stderr }); }, limits.wallMs);
          child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > limits.outputKb * 1024) { overflow = true; child.kill('SIGKILL'); finish({ status: 'output_limit', stdout: stdout.slice(0, limits.outputKb * 1024), stderr }); } });
          child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-8192); });
          child.on('error', error => finish({ status: 'infrastructure_error', stdout, stderr, message: error.message }));
          child.on('close', code => finish(overflow ? { status: 'output_limit', stdout, stderr } : { status: code === 0 ? 'ok' : /MemoryError/.test(stderr) ? 'memory_limit' : 'runtime_error', stdout, stderr }));
          child.stdin.on('error', () => { /* The program may exit before reading all input. */ });
          child.stdin.end(stdin);
        });
      } finally {
        // Best effort: on Windows a just-killed process can hold the file briefly.
        await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
      }
    },
  };
}
