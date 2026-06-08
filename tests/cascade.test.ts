import { describe, it, expect, beforeEach } from 'vitest';
import { adminClient, createTestUser } from './setup';

describe('FK CASCADE — binder → cards', () => {
  let userId: string;
  let binderId: string;

  beforeEach(async () => {
    const suffix = Date.now();
    const user = await createTestUser(`cascade-${suffix}`);
    userId = user.id;

    const { data: binder } = await adminClient
      .from('binders')
      .insert({ user_id: userId, type: 'FOR_TRADE', name: 'Binder Test' })
      .select('id')
      .single();
    binderId = binder!.id;

    await adminClient.from('cards').insert([
      { binder_id: binderId, user_id: userId, scryfall_id: 'abc1', name: 'Lightning Bolt', set_name: 'M21', image_url: '', condition: 'NM' },
      { binder_id: binderId, user_id: userId, scryfall_id: 'abc2', name: 'Counterspell',   set_name: 'M21', image_url: '', condition: 'NM' },
    ]);
  });

  it('eliminar binder elimina sus cards', async () => {
    await adminClient.from('binders').delete().eq('id', binderId);

    const { data: cards } = await adminClient.from('cards').select('id').eq('binder_id', binderId);
    expect(cards).toHaveLength(0);
  });

  it('eliminar user elimina sus binders y cards', async () => {
    // Borrar desde public.users activa el CASCADE de Postgres sincrónicamente.
    // auth.admin.deleteUser usa GoTrue y el cascade puede tener delay en local.
    await adminClient.from('users').delete().eq('id', userId);

    const { data: binders } = await adminClient.from('binders').select('id').eq('user_id', userId);
    const { data: cards }   = await adminClient.from('cards').select('id').eq('user_id', userId);
    expect(binders).toHaveLength(0);
    expect(cards).toHaveLength(0);
  });
});
