import { describe, it, expect, beforeEach } from 'vitest';
import { adminClient, createTestUser } from './setup';

describe('Trigger tr_cards_count — binders.card_count', () => {
  let userId: string;
  let binderId: string;

  const getCount = async () => {
    const { data } = await adminClient.from('binders').select('card_count').eq('id', binderId).single();
    return data!.card_count as number;
  };

  const insertCard = async (scryfallId: string) => {
    const { data } = await adminClient
      .from('cards')
      .insert({ binder_id: binderId, user_id: userId, scryfall_id: scryfallId, name: `Card ${scryfallId}`, set_name: 'M21', image_url: '', condition: 'NM' })
      .select('id')
      .single();
    return data!.id as string;
  };

  beforeEach(async () => {
    const user = await createTestUser(`trigger-${Date.now()}`);
    userId = user.id;

    const { data: binder } = await adminClient
      .from('binders')
      .insert({ user_id: userId, type: 'FOR_TRADE', name: 'Count Test' })
      .select('id')
      .single();
    binderId = binder!.id;
  });

  it('empieza en 0', async () => {
    expect(await getCount()).toBe(0);
  });

  it('INSERT incrementa en 1', async () => {
    await insertCard('t1');
    expect(await getCount()).toBe(1);
  });

  it('múltiples INSERT acumulan correctamente', async () => {
    await insertCard('t2');
    await insertCard('t3');
    await insertCard('t4');
    expect(await getCount()).toBe(3);
  });

  it('DELETE decrementa en 1', async () => {
    const cardId = await insertCard('t5');
    await insertCard('t6');
    await adminClient.from('cards').delete().eq('id', cardId);
    expect(await getCount()).toBe(1);
  });

  it('borrar todas las cards deja count en 0', async () => {
    await insertCard('t7');
    await insertCard('t8');
    await adminClient.from('cards').delete().eq('binder_id', binderId);
    expect(await getCount()).toBe(0);
  });
});
