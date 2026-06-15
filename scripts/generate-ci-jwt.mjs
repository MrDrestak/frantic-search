import { createHmac } from 'node:crypto';
import { appendFileSync } from 'node:fs';

const secret = process.env.JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';

function sign(payload) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return h + '.' + p + '.' + createHmac('sha256', secret).update(h + '.' + p).digest('base64url');
}

const base = { iss: 'supabase-demo', exp: 1983812996 };
appendFileSync(
  process.env.GITHUB_ENV,
  'VITE_SUPABASE_ANON_KEY=' + sign({ ...base, role: 'anon' }) + '\n' +
  'SUPABASE_SERVICE_ROLE_KEY=' + sign({ ...base, role: 'service_role' }) + '\n'
);
