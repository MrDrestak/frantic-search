import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Abort any request that takes longer than 9 seconds.
// This prevents supabase-js from hanging when the auth session-refresh
// request never completes (which blocks all subsequent DB requests).
const fetchWithTimeout = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 9000);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(tid));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
});
