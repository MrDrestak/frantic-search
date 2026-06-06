import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Auth token refresh uses a short 4s timeout so a stale/expired token fails fast
// and getSession() resolves quickly instead of hanging the app on load.
// All other DB/storage requests use 9s.
const fetchWithTimeout = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : (input as Request).url ?? '';
  const ms = url.includes('/auth/v1/token') ? 4000 : 9000;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), ms);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(tid));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
});
