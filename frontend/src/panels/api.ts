import { trackRequest } from '../components/loading/loadingStore';
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

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
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

  // Panels only ever expect JSON. An HTML page here means the request did not reach the academy backend
  // (for example, a dev server that has not loaded the /v1 proxy yet).
  const isHtml = response.headers.get('content-type')?.includes('text/html') ?? false;

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || isHtml) {
    const error = (data as { error?: { code?: string; message?: string; fields?: Record<string, string>; details?: Record<string, boolean> } } | null)?.error;
    if (error) {
      throw new ApiError(error.code ?? `HTTP_${response.status}`, error.message ?? 'Something went wrong.', response.status, error.fields ?? undefined, error.details);
    }
    // No academy error body: the proxy could not reach the backend, or the reply came from somewhere else.
    if ([502, 503, 504].includes(response.status)) {
      throw new ApiError('UNREACHABLE', 'The academy backend is not running. In the backend folder, start it with: uvicorn app.main:app --port 8000 — then try again.', response.status);
    }
    if (response.status === 500) {
      throw new ApiError('SERVER_ERROR', 'The academy backend hit an error. Check the terminal running the backend, then try again.', response.status);
    }
    throw new ApiError(
      'UNEXPECTED_REPLY',
      `The academy service replied in an unexpected way (HTTP ${response.status}). Restart the frontend (npm run dev) so it picks up the backend proxy, then try again.`,
      response.status,
    );
  }
  return data as T;
}

/** Every call is counted so the thin loading bar at the top of the screen knows work is in flight. */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const finish = trackRequest();
  try {
    return await request<T>(path, options);
  } finally {
    finish();
  }
}
