import { describe, it, expect } from 'vitest';
import { adminClient } from './setup';

describe('Supabase local — conexión', () => {
  it('puede leer la tabla users', async () => {
    const { error } = await adminClient.from('users').select('id').limit(1);
    expect(error).toBeNull();
  });

  it('puede leer la tabla binders', async () => {
    const { error } = await adminClient.from('binders').select('id').limit(1);
    expect(error).toBeNull();
  });

  it('puede leer la tabla cards', async () => {
    const { error } = await adminClient.from('cards').select('id').limit(1);
    expect(error).toBeNull();
  });
});
