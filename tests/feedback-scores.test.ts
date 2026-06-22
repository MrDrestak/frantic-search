import { describe, it, expect, beforeEach } from 'vitest';
import { adminClient, createTestUser } from './setup';

/**
 * Estas pruebas cubren la función submit_feedback() de Postgres.
 *
 * ADVERTENCIA: store.ts NO llama a esta función — usa su propia lógica
 * client-side en tradeService.submitFeedback() con reglas distintas.
 * Hay que unificar en un sprint futuro.
 */

describe('submit_feedback() — reputación atómica', () => {
  let buyerId: string;
  let sellerId: string;
  let interactionId: string;

  const getScores = async () => {
    const { data: buyer }  = await adminClient.from('users').select('searcher_score').eq('id', buyerId).single();
    const { data: seller } = await adminClient.from('users').select('trader_score').eq('id', sellerId).single();
    return { buyerScore: buyer!.searcher_score as number, sellerScore: seller!.trader_score as number };
  };

  const submitFeedback = async (userId: string, feedback: string) =>
    adminClient.rpc('submit_feedback', {
      p_interaction_id: interactionId,
      p_user_id: userId,
      p_feedback: feedback,
    });

  beforeEach(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const buyer  = await createTestUser(`buyer-${suffix}`);
    const seller = await createTestUser(`seller-${suffix}`);
    buyerId  = buyer.id;
    sellerId = seller.id;

    const { data, error } = await adminClient
      .from('trade_interactions')
      .insert({
        buyer_id:    buyerId,
        seller_id:   sellerId,
        buyer_name:  'Buyer Test',
        seller_name: 'Seller Test',
        card_name:   'Test Card',
        status:      'PENDING',
      })
      .select('id')
      .single();
    if (error) throw new Error(`beforeEach insert failed: ${error.message}`);
    interactionId = data!.id;
  });

  it('un solo feedback no cambia puntajes ni cierra la interacción', async () => {
    await submitFeedback(buyerId, 'EXCELENTE');
    const scores = await getScores();
    expect(scores.buyerScore).toBe(0);
    expect(scores.sellerScore).toBe(0);

    const { data } = await adminClient.from('trade_interactions').select('status').eq('id', interactionId).single();
    expect(data!.status).toBe('PENDING');
  });

  it('ambos EXCELENTE → buyer +3, seller +3, status COMPLETED', async () => {
    await submitFeedback(buyerId, 'EXCELENTE');
    await submitFeedback(sellerId, 'EXCELENTE');
    const { buyerScore, sellerScore } = await getScores();
    expect(buyerScore).toBe(3);
    expect(sellerScore).toBe(3);

    const { data } = await adminClient.from('trade_interactions').select('status').eq('id', interactionId).single();
    expect(data!.status).toBe('COMPLETED');
  });

  it('ambos BUENO → buyer +1, seller +1', async () => {
    await submitFeedback(buyerId, 'BUENO');
    await submitFeedback(sellerId, 'BUENO');
    const { buyerScore, sellerScore } = await getScores();
    expect(buyerScore).toBe(1);
    expect(sellerScore).toBe(1);
  });

  it('ambos MALO → buyer -2, seller -2', async () => {
    await submitFeedback(buyerId, 'MALO');
    await submitFeedback(sellerId, 'MALO');
    const { buyerScore, sellerScore } = await getScores();
    expect(buyerScore).toBe(-2);
    expect(sellerScore).toBe(-2);
  });

  it('asimétrico: buyer EXCELENTE + seller NO_CONCRETADO → ambos +1', async () => {
    await submitFeedback(buyerId, 'EXCELENTE');
    await submitFeedback(sellerId, 'NO_CONCRETADO');
    const { buyerScore, sellerScore } = await getScores();
    expect(buyerScore).toBe(1);
    expect(sellerScore).toBe(1);
  });

  it('asimétrico: buyer EXCELENTE + seller MALO → buyer -2, seller +3', async () => {
    await submitFeedback(buyerId, 'EXCELENTE');
    await submitFeedback(sellerId, 'MALO');
    const { buyerScore, sellerScore } = await getScores();
    // seller_award = buyer_fb EXCELENTE → +3 para seller
    // buyer_award  = seller_fb MALO    → -2 para buyer
    expect(buyerScore).toBe(-2);
    expect(sellerScore).toBe(3);
  });
});
