import { beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function createTestUser(emailPrefix: string, tier: string = 'COMMON') {
  const email = `${emailPrefix}@test.frantic`;
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
  });
  if (error) throw new Error(`createTestUser failed: ${error.message}`);

  // El trigger on_auth_user_created crea el perfil. Si necesitamos un tier distinto, lo actualizamos.
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
  // Limpiar todos los usuarios de test (CASCADE elimina sus binders, cards, etc.)
  const { data: testUsers } = await adminClient
    .from('users')
    .select('id')
    .like('email', '%@test.frantic');

  if (testUsers?.length) {
    for (const u of testUsers) {
      await adminClient.auth.admin.deleteUser(u.id);
    }
  }
});
