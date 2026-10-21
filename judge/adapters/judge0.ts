import type { ExecutionAdapter, ExecutionResult, ExecutionStatus } from '../types';

/**
 * Judge0 CE adapter (https://github.com/judge0/judge0, GPL-3.0, self-hosted). Runs on the
 * server only: the URL and auth token come from server environment variables and are never
 * sent to browsers. Every request asks for no network, one process and strict limits.
 */
export interface Judge0Options {
  baseUrl: string;
  authToken?: string;
  /** Judge0 language id for the pinned Python runtime (71 = Python 3.8.1 in Judge0 CE 1.13.x). */
  pythonLanguageId?: number;
  fetchImpl?: typeof fetch;
  requestTimeoutMs?: number;
}

const encode = (text: string) => Buffer.from(text, 'utf8').toString('base64');
const decode = (text: string | null | undefined) => text ? Buffer.from(text, 'base64').toString('utf8') : '';

/** Judge0 status ids: 3 accepted, 5 time limit, 6 compilation error, 7–12 runtime errors, 13 internal error, 14 exec format error. */
export function mapJudge0Status(id: number, message = ''): ExecutionStatus {
  if (id === 3) return 'ok';
  if (id === 5) return 'time_limit';
  if (id === 6) return 'compile_error';
  if (id === 7 && /memory|SIGKILL/i.test(message)) return 'memory_limit';
  if (id >= 7 && id <= 12) return 'runtime_error';
  return 'infrastructure_error';
}

export function createJudge0Adapter(options: Judge0Options): ExecutionAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const root = options.baseUrl.replace(/\/$/, '');
  return {
    name: 'judge0',
    acceptsUntrustedCode: true,
    async execute({ program, stdin, limits }): Promise<ExecutionResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.requestTimeoutMs ?? limits.wallMs + 15_000);
      try {
        const response = await fetchImpl(`${root}/submissions?base64_encoded=true&wait=true&fields=status,stdout,stderr,compile_output,message,time,memory`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json', ...(options.authToken ? { 'X-Auth-Token': options.authToken } : {}) },
          body: JSON.stringify({
            source_code: encode(program),
            language_id: options.pythonLanguageId ?? 71,
            stdin: encode(stdin),
            cpu_time_limit: limits.cpuMs / 1000,
            cpu_extra_time: 0.5,
            wall_time_limit: limits.wallMs / 1000,
            memory_limit: limits.memoryKb,
            max_processes_and_or_threads: 1,
            max_file_size: 64,
            enable_network: false,
            enable_per_process_and_thread_time_limit: false,
            redirect_stderr_to_stdout: false,
          }),
        });
        if (response.status === 429 || response.status >= 500) return { status: 'infrastructure_error', stdout: '', stderr: '', message: `Judge0 responded ${response.status}` };
        if (!response.ok) return { status: 'infrastructure_error', stdout: '', stderr: '', message: `Judge0 rejected the request (${response.status})` };
        const body = await response.json() as { status?: { id: number; description?: string }; stdout?: string; stderr?: string; compile_output?: string; message?: string; time?: string; memory?: number };
        if (!body.status) return { status: 'infrastructure_error', stdout: '', stderr: '', message: 'Judge0 returned no status' };
        const stdout = decode(body.stdout);
        const status = stdout.length > limits.outputKb * 1024 ? 'output_limit' : mapJudge0Status(body.status.id, `${body.status.description ?? ''} ${decode(body.message)}`);
        return { status, stdout: stdout.slice(0, limits.outputKb * 1024), stderr: decode(body.stderr).slice(0, 8192), timeMs: body.time ? Number(body.time) * 1000 : undefined, memoryKb: body.memory, message: status === 'infrastructure_error' ? body.status.description : undefined };
      } catch (cause) {
        return { status: 'infrastructure_error', stdout: '', stderr: '', message: cause instanceof Error ? cause.message : 'Judge0 request failed' };
      } finally { clearTimeout(timer); }
    },
  };
}

/** Checks a Judge0 instance's configuration before trusting it with visitor code. */
export async function verifyJudge0Config(options: Pick<Judge0Options, 'baseUrl' | 'authToken' | 'fetchImpl'>, required = { maxCpuSeconds: 5, maxMemoryKb: 256_000 }): Promise<string[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const issues: string[] = [];
  try {
    const response = await fetchImpl(`${options.baseUrl.replace(/\/$/, '')}/config_info`, { headers: options.authToken ? { 'X-Auth-Token': options.authToken } : {} });
    if (!response.ok) return [`config_info returned ${response.status}`];
    const config = await response.json() as Record<string, unknown>;
    if (config.enable_network !== false) issues.push('Network access is enabled by default; set ENABLE_NETWORK=false.');
    if (config.allow_enable_network !== false) issues.push('Submissions may switch network on; set ALLOW_ENABLE_NETWORK=false.');
    if (typeof config.max_cpu_time_limit === 'number' && config.max_cpu_time_limit > required.maxCpuSeconds) issues.push(`MAX_CPU_TIME_LIMIT is ${config.max_cpu_time_limit}s; keep it at or below ${required.maxCpuSeconds}s.`);
    if (typeof config.max_memory_limit === 'number' && config.max_memory_limit > required.maxMemoryKb) issues.push(`MAX_MEMORY_LIMIT is ${config.max_memory_limit} KB; keep it at or below ${required.maxMemoryKb} KB.`);
    if (typeof config.max_max_processes_and_or_threads === 'number' && config.max_max_processes_and_or_threads > 60) issues.push('Process limit ceiling is high; lower MAX_MAX_PROCESSES_AND_OR_THREADS.');
  } catch (cause) { issues.push(cause instanceof Error ? cause.message : 'Could not reach Judge0'); }
  return issues;
}
