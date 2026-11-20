/** Client for the Technical Academy API (spec §26). Every panel screen goes through this one function. */
export const API_BASE = '/v1';

export class ApiError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;
  constructor(code: string, message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError('NETWORK', 'The academy service is not reachable right now. Please try again shortly.', 0);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = (data as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null)?.error;
    throw new ApiError(
      error?.code ?? `HTTP_${response.status}`,
      error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      error?.fields,
    );
  }
  return data as T;
}
