'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auctionService } from '@/services/store';
import { useAuctionRealtime } from '@/hooks/useAuctionRealtime';
import { useBidsFeed } from '@/hooks/useBidsFeed';
import type { AuctionCard } from '@/types';

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [card, setCard] = useState<AuctionCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    auctionService.getAuctionCard(id).then(setCard).finally(() => setLoading(false));
  }, [id]);

  // Live auction state — updates in real time via Supabase Realtime
  const live = useAuctionRealtime(id, {
    current_bid: card?.current_bid ?? undefined,
    top_bidder_id: card?.top_bidder_id ?? undefined,
    auction_end_date: card?.auction_end_date ?? undefined,
    bid_count: card?.bid_count,
    auction_status: card?.auction_status ?? undefined,
  });

  const { bids } = useBidsFeed(id);

  async function placeBid() {
    if (!user || !bidAmount) return;
    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) return;
    setError(null);
    setBidding(true);
    try {
      await auctionService.placeBid(id, user.id, amount);
      setBidAmount('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg === 'BID_TOO_LOW' ? 'Tu puja debe superar la puja actual.' :
        msg === 'AUCTION_ENDED' ? 'Esta subasta ya terminó.' :
        msg === 'SELF_BID_FORBIDDEN' ? 'No podés pujar en tu propia subasta.' :
        'Error al pujar. Intentá de nuevo.'
      );
    } finally {
      setBidding(false);
    }
  }

  if (loading) return <PageSkeleton />;
  if (!card) return <p className="p-8 text-sm text-zinc-500">Subasta no encontrada.</p>;

  const currentBid = live.current_bid ?? card.current_bid ?? card.base_price ?? 0;
  const endsAt = live.auction_end_date ? new Date(live.auction_end_date) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Card image */}
        <div>
          {card.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.image_url} alt={card.name} className="w-full max-w-xs mx-auto rounded-xl shadow-md" />
          )}
        </div>

        {/* Auction info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{card.name}</h1>
            <p className="text-sm text-zinc-500">{card.condition}{card.is_foil ? ' ✨' : ''} · {card.seller_name}</p>
            {card.set_name && <p className="text-xs text-zinc-400">{card.set_name}</p>}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Puja actual</span>
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">${currentBid}</span>
            </div>
            {card.buy_it_now_price && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Comprar ahora</span>
                <span className="font-semibold text-emerald-600">${card.buy_it_now_price}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Pujas</span>
              <span className="text-zinc-700 dark:text-zinc-300">{live.bid_count ?? card.bid_count}</span>
            </div>
            {endsAt && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Termina</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {endsAt.toLocaleString('es-PE')}
                </span>
              </div>
            )}
          </div>

          {/* Bid form */}
          {user && live.auction_status === 'ACTIVE' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Más de $${currentBid}`}
                  className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <button
                  onClick={placeBid}
                  disabled={bidding || !bidAmount}
                  className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  {bidding ? 'Pujando...' : 'Pujar'}
                </button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Bid history */}
      {bids.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Historial de pujas</h2>
          <div className="space-y-2">
            {bids.map((bid) => (
              <div key={bid.id} className="flex justify-between rounded-lg border border-zinc-100 bg-white px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                <span className="text-zinc-500">{new Date(bid.created_at).toLocaleString('es-PE')}</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">${bid.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 grid gap-8 lg:grid-cols-2">
      <div className="h-96 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
