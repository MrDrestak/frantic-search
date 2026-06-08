import { describe, it, expect, beforeEach } from 'vitest';
import { adminClient, createTestUser } from './setup';

describe('place_bid() — subasta atómica', () => {
  let sellerId: string;
  let bidderId: string;
  let cardId: string;

  const bid = async (userId: string, amount: number) =>
    adminClient.rpc('place_bid', { p_card_id: cardId, p_user_id: userId, p_amount: amount });

  beforeEach(async () => {
    const suffix = Date.now();
    const seller = await createTestUser(`seller-${suffix}`);
    const bidder = await createTestUser(`bidder-${suffix}`);
    sellerId = seller.id;
    bidderId = bidder.id;

    const { data: binder } = await adminClient
      .from('binders')
      .insert({ user_id: sellerId, type: 'AUCTION', name: 'Subasta' })
      .select('id')
      .single();

    const endDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1h
    const { data: card } = await adminClient
      .from('cards')
      .insert({
        binder_id: binder!.id,
        user_id: sellerId,
        binder_type: 'AUCTION',
        scryfall_id: `bid-${suffix}`,
        name: 'Black Lotus',
        set_name: 'Alpha',
        image_url: '',
        condition: 'NM',
        auction_status: 'ACTIVE',
        base_price: 10.00,
        current_bid: 10.00,
        auction_end_date: endDate,
      })
      .select('id')
      .single();
    cardId = card!.id;
  });

  it('puja válida actualiza current_bid y top_bidder_id', async () => {
    const { error } = await bid(bidderId, 15);
    expect(error).toBeNull();

    const { data } = await adminClient.from('cards').select('current_bid, top_bidder_id, bid_count').eq('id', cardId).single();
    expect(data!.current_bid).toBe(15);
    expect(data!.top_bidder_id).toBe(bidderId);
    expect(data!.bid_count).toBe(1);
  });

  it('puja válida registra entrada en bids', async () => {
    await bid(bidderId, 20);
    const { data } = await adminClient.from('bids').select('amount').eq('card_id', cardId);
    expect(data).toHaveLength(1);
    expect(data![0].amount).toBe(20);
  });

  it('BID_TOO_LOW — puja igual o menor al current_bid', async () => {
    const { error } = await bid(bidderId, 10);
    expect(error?.message).toContain('BID_TOO_LOW');
  });

  it('SELF_BID_FORBIDDEN — el vendedor no puede pujarse a sí mismo', async () => {
    const { error } = await bid(sellerId, 15);
    expect(error?.message).toContain('SELF_BID_FORBIDDEN');
  });

  it('AUCTION_ENDED — no se puede pujar en subasta vencida', async () => {
    await adminClient.from('cards').update({ auction_status: 'ENDED' }).eq('id', cardId);
    const { error } = await bid(bidderId, 15);
    expect(error?.message).toContain('AUCTION_ENDED');
  });

  it('overtime — puja en últimos 5 min extiende 5 min más', async () => {
    // Poner la subasta a 3 minutos del fin
    const almostOver = new Date(Date.now() + 3 * 60 * 1000).toISOString();
    await adminClient.from('cards').update({ auction_end_date: almostOver }).eq('id', cardId);

    const before = Date.now();
    await bid(bidderId, 15);
    const after = Date.now();

    const { data } = await adminClient.from('cards').select('auction_end_date').eq('id', cardId).single();
    const newEnd = new Date(data!.auction_end_date).getTime();

    // La nueva fecha debe ser ~5 min desde ahora (con margen de 10s por ejecución)
    expect(newEnd).toBeGreaterThan(before + 4.5 * 60 * 1000);
    expect(newEnd).toBeLessThan(after  + 5.5 * 60 * 1000);
  });
});
