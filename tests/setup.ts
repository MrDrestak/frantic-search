import { beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function createTestUser(emailPrefix: string, tier: string = 'COMMON') {
  const email = `${emailPrefix}@test.frantic`;

  // Safety net: delete leftover from a crashed previous run before creating
  const { data: existing } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const leftover = existing?.users?.find(u => u.email === email);
  if (leftover) await adminClient.auth.admin.deleteUser(leftover.id);

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
  });
  if (error) throw new Error(`createTestUser failed: ${error.message}`);

  // Wait for the on_auth_user_created trigger to create the public profile.
  // Without this, FKs to public.users fail intermittently in CI.
  for (let i = 0; i < 20; i++) {
    const { data: profile } = await adminClient.from('users').select('id').eq('id', data.user.id).maybeSingle();
    if (profile) break;
    await new Promise(r => setTimeout(r, 100));
  }

  if (tier !== 'COMMON') {
    await adminClient
      .from('users')
      .update({ subscription_tier: tier })
      .eq('id', data.user.id);
  }

  return data.user;
}

beforeAll(async () => {
  const { error } = await adminClient.from('users').select('id').limit(1);
  if (error) throw new Error(`Sin conexión al Supabase local: ${error.message}`);
});

afterAll(async () => {
  // Limpiar todos los usuarios de test desde auth.users (más confiable que la tabla pública)
  const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const testUsers = data?.users?.filter(u => u.email?.endsWith('@test.frantic')) ?? [];
  for (const u of testUsers) {
    await adminClient.auth.admin.deleteUser(u.id);
  }
});
