import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

const getEnvVar = (name: string, fallback: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] as string;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
    return import.meta.env[name] as string;
  }
  return fallback;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL', getEnvVar('VITE_SUPABASE_URL', 'https://bzrziphgocbsopvidknp.supabase.co'));
const supabaseKey = getEnvVar(
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  getEnvVar(
    'VITE_SUPABASE_ANON_KEY',
    getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_jCEWQltUSbu89lmGoSXKUw_9erWEpBV')
  )
);
const serviceRoleKey = typeof process !== 'undefined' ? process.env?.SUPABASE_SERVICE_ROLE_KEY : undefined;

export interface CookieMethodsServer {
  getAll(): Array<{ name: string; value: string }>;
  setAll?(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>): void;
}

/**
 * Creates a server Supabase client.
 * If a cookieStore is provided, uses createServerClient (@supabase/ssr) to propagate user sessions.
 * If no cookieStore is provided, returns a stateless server client.
 */
export const createClient = (cookieStore?: CookieMethodsServer): SupabaseClient => {
  if (!cookieStore) {
    return createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookieStore.setAll?.(cookiesToSet);
        } catch {
          // Ignore if called in read-only server context
        }
      },
    },
  });
};

/**
 * Creates a server Supabase client directly from a standard Request object (Vercel Functions / Web Standards).
 */
export const createClientFromRequest = (request: Request, responseHeaders?: Headers): SupabaseClient => {
  const cookieHeader = request.headers.get('cookie') || '';
  const parsedCookies = cookieHeader
    .split(';')
    .map((c) => c.trim().split('='))
    .filter(([name]) => Boolean(name))
    .map(([name, ...rest]) => ({ name, value: decodeURIComponent(rest.join('=')) }));

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return parsedCookies;
      },
      setAll(cookiesToSet) {
        if (!responseHeaders) return;
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookieStr = `${name}=${encodeURIComponent(value)}`;
          const opts = options as Record<string, unknown> | undefined;
          if (opts?.path) cookieStr += `; Path=${opts.path}`;
          if (opts?.maxAge) cookieStr += `; Max-Age=${opts.maxAge}`;
          if (opts?.domain) cookieStr += `; Domain=${opts.domain}`;
          if (opts?.sameSite) cookieStr += `; SameSite=${opts.sameSite}`;
          if (opts?.secure) cookieStr += '; Secure';
          if (opts?.httpOnly) cookieStr += '; HttpOnly';
          responseHeaders.append('Set-Cookie', cookieStr);
        });
      },
    },
  });
};

/**
 * Privileged client for backend administrative jobs. Bypasses Row Level Security.
 * Requires SUPABASE_SERVICE_ROLE_KEY to be configured in server environment.
 */
export const createAdminClient = (): SupabaseClient => {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for createAdminClient.');
  }
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
