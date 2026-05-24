'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auctionService } from '@/services/store';
import type { AuctionCard } from '@/types';

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auctionService.getActiveAuctions().then(setAuctions).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Subastas activas</h1>

      {auctions.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">No hay subastas activas en este momento.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {auctions.map((card) => {
            const endsAt = card.auction_end_date ? new Date(card.auction_end_date) : null;
            return (
              <Link
                key={card.id}
                href={`/auctions/${card.id}`}
                className="rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                {card.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image_url} alt={card.name} className="w-full rounded-t-xl object-cover" />
                )}
                <div className="p-3 space-y-1">
                  <p className="font-semibold text-zinc-900 truncate dark:text-zinc-50">{card.name}</p>
                  <p className="text-xs text-zinc-500">{card.condition}{card.is_foil ? ' ✨' : ''} · {card.seller_name}</p>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="text-xs text-zinc-400">Puja actual</p>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        ${card.current_bid ?? card.base_price ?? 0}
                      </p>
                    </div>
                    {endsAt && (
                      <p className="text-xs text-zinc-400">
                        {endsAt.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                      </p>
                    )}
                  </div>
                  {card.bid_count > 0 && (
                    <p className="text-xs text-zinc-400">{card.bid_count} {card.bid_count === 1 ? 'puja' : 'pujas'}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}
