/** Client for the Academy API. Every panel screen goes through this one function. */
export const API_BASE = '/v1';

export class ApiError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;
  details?: Record<string, boolean>;
  constructor(code: string, message: string, status: number, fields?: Record<string, string>, details?: Record<string, boolean>) {
    super(message);
    this.code = code;
    this.status = status;
    this.fields = fields;
    this.details = details;
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** The CSRF cookie is readable by the page; the server checks it against the X-CSRF-Token header. */
function csrfToken(): string {
  const match = document.cookie.match(/(?:^|; )academy_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken();

  let response: Response;
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      body,
      credentials: 'include',
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new ApiError('NETWORK', 'The academy service is not reachable. Start the backend and try again.', 0);
  }

  if (response.headers.get('content-type')?.includes('text/html')) {
    return (await response.text()) as T;
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = (data as { error?: { code?: string; message?: string; fields?: Record<string, string>; details?: Record<string, boolean> } } | null)?.error;
    throw new ApiError(
      error?.code ?? `HTTP_${response.status}`,
      error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      error?.fields ?? undefined,
      error?.details,
    );
  }
  return data as T;
}
