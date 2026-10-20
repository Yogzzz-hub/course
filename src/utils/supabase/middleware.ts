import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

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

/**
 * Middleware session refresher for standard Request/Response pipelines.
 * Parses cookies from incoming request, calls Supabase getUser(), and returns response headers with any updated session cookies.
 */
export const updateSession = async (request: Request): Promise<{ responseHeaders: Headers; user: User | null }> => {
  const responseHeaders = new Headers();
  const cookieHeader = request.headers.get('cookie') || '';
  const parsedCookies = cookieHeader
    .split(';')
    .map((c) => c.trim().split('='))
    .filter(([name]) => Boolean(name))
    .map(([name, ...rest]) => ({ name, value: decodeURIComponent(rest.join('=')) }));

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return parsedCookies;
      },
      setAll(cookiesToSet) {
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

  try {
    const { data: { user } } = await supabase.auth.getUser();
    return { responseHeaders, user };
  } catch {
    return { responseHeaders, user: null };
  }
};
