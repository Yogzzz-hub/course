import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const getEnvVar = (name: string, fallback: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
    return import.meta.env[name] as string;
  }
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] as string;
  }
  return fallback;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', getEnvVar('NEXT_PUBLIC_SUPABASE_URL', 'https://bzrziphgocbsopvidknp.supabase.co'));
const supabaseKey = getEnvVar(
  'VITE_SUPABASE_ANON_KEY',
  getEnvVar(
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_jCEWQltUSbu89lmGoSXKUw_9erWEpBV')
  )
);

let browserClient: SupabaseClient | undefined;

/**
 * Creates or retrieves the singleton Supabase browser client.
 * Manages PKCE auth sessions and cookie persistence automatically in browser environments.
 */
export const createClient = (): SupabaseClient => {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(supabaseUrl, supabaseKey);
  return browserClient;
};

/**
 * Default singleton instance for quick component queries and subscriptions.
 */
export const supabase = createClient();
