import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const fetchWithTimeout = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 9000);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(tid));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
  auth: {
    // autoRefreshToken: false prevents supabase-js from retrying token refresh
    // inside initializePromise. With true (default), an AbortError causes a
    // retry loop that blocks ALL queries indefinitely on page load.
    // We handle the refresh ourselves in store.ts subscribe().
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
