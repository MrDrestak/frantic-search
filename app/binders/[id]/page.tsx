'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { binderService, cardService } from '@/services/store';
import type { Binder, CardWithPrice } from '@/types';

export default function BinderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [binder, setBinder] = useState<Binder | null>(null);
  const [cards, setCards] = useState<CardWithPrice[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!id) return;
    Promise.all([binderService.getBinder(id), cardService.getBinderCards(id)])
      .then(([b, c]) => { setBinder(b); setCards(c); })
      .finally(() => setFetching(false));
  }, [id]);

  if (loading || fetching) return <PageSkeleton />;
  if (!binder) return <p className="p-8 text-sm text-zinc-500">Binder no encontrado.</p>;

  const isOwner = user?.id === binder.user_id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{binder.type}</p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{binder.name}</h1>
          <p className="text-sm text-zinc-500">{binder.card_count} cartas</p>
        </div>
        {isOwner && (
          <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900">
            + Agregar carta
          </button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cards.length === 0 ? (
          <p className="col-span-full text-sm text-zinc-500">Este binder está vacío.</p>
        ) : (
          cards.map((card) => {
            const ckPrice = card.prices?.price_sell_usd;
            const mult = binder.price_multiplier ?? 3.0;
            const displayPen = card.custom_price ?? (ckPrice ? +(ckPrice * mult).toFixed(2) : null);
            return (
              <div
                key={card.id}
                className="rounded-xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {card.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image_url} alt={card.name} className="w-full rounded" />
                )}
                <p className="mt-1 truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">{card.name}</p>
                <p className="text-xs text-zinc-400">{card.condition}{card.is_foil ? ' ✨' : ''}</p>
                {ckPrice && <p className="text-xs text-zinc-400">CK ${ckPrice}</p>}
                {displayPen && (
                  <p className="text-xs font-semibold text-emerald-600">S/ {displayPen}</p>
                )}
                {isOwner && (
                  <button
                    onClick={() => cardService.removeCard(card.id).then(() =>
                      setCards((prev) => prev.filter((c) => c.id !== card.id))
                    )}
                    className="mt-1 text-xs text-red-400 hover:text-red-600"
                  >
                    Quitar
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}
