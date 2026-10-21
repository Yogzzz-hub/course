import { spawnSync } from 'node:child_process';

/**
 * Local runtimes for validating *trusted* repository content in tests: question answer keys,
 * challenge reference solutions and deliberately faulty solutions. Visitor code never runs here.
 */
export interface RunResult { stdout: string; stderr: string; status: number | null; timedOut: boolean }

const normalise = (text: string) => text.replace(/\r\n/g, '\n').replace(/\s+$/, '');

function detectPython(): string[] | null {
  for (const candidate of [process.env.PYTHON ? [process.env.PYTHON] : null, ['python3'], ['python'], ['py', '-3']]) {
    if (!candidate) continue;
    const probe = spawnSync(candidate[0], [...candidate.slice(1), '-c', 'import sys; print(sys.version_info[0])'], { encoding: 'utf8' });
    if (probe.status === 0 && probe.stdout.trim() === '3') return candidate;
  }
  return null;
}
export const python = detectPython();

function run(command: string[], source: string, timeoutMs: number, args: string[] = []): RunResult {
  const result = spawnSync(command[0], [...command.slice(1), ...args], { input: source, encoding: 'utf8', timeout: timeoutMs, env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' } });
  return { stdout: normalise(result.stdout ?? ''), stderr: normalise(result.stderr ?? ''), status: result.status, timedOut: result.error?.message.includes('ETIMEDOUT') ?? false };
}

export function runPython(source: string, timeoutMs = 10_000): RunResult {
  if (!python) throw new Error('Python 3 is not available. Set PYTHON to a Python 3 executable.');
  return run(python, source, timeoutMs, ['-']);
}
export function runNode(source: string, timeoutMs = 10_000): RunResult {
  return run([process.execPath], source, timeoutMs, ['-']);
}
export function runSql(fixture: string, query: string): RunResult {
  const script = [
    'import json, sqlite3, sys',
    'data = json.loads(sys.argv[1])',
    'con = sqlite3.connect(":memory:")',
    'con.executescript(data["fixture"])',
    'for row in con.execute(data["query"]).fetchall():',
    '    print(" | ".join(str(value) for value in row))',
  ].join('\n');
  if (!python) throw new Error('Python 3 is not available. Set PYTHON to a Python 3 executable.');
  const result = spawnSync(python[0], [...python.slice(1), '-c', script, JSON.stringify({ fixture, query })], { encoding: 'utf8', timeout: 10_000 });
  return { stdout: normalise(result.stdout ?? ''), stderr: normalise(result.stderr ?? ''), status: result.status, timedOut: false };
}
