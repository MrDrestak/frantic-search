'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { matchingService, alertService } from '@/services/store';
import type { TradeableCard } from '@/types';

export default function MarketMatchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TradeableCard[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!user || !query.trim()) return;
    const names = query.split('\n').map((s) => s.trim()).filter(Boolean);
    setLoading(true);
    try {
      const matches = await matchingService.findMatches(names, user.id);
      setResults(matches);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Market Match</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pegá tu wishlist (una carta por línea) y encontramos quién las tiene para tradear.
        </p>
      </div>

      <div className="space-y-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={'Lightning Bolt\nCounterspell\nSwords to Plowshares'}
          rows={6}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          onClick={search}
          disabled={loading || !user}
          className="rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {loading ? 'Buscando...' : 'Buscar matches'}
        </button>
        {!user && <p className="text-xs text-zinc-400">Necesitás estar logueado para buscar matches.</p>}
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
          </h2>
          <div className="space-y-2">
            {results.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {card.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image_url} alt={card.name} className="h-16 w-12 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{card.name}</p>
                  <p className="text-xs text-zinc-500">{card.condition}{card.is_foil ? ' ✨' : ''} · {card.seller_name}</p>
                  <p className="text-xs text-zinc-400">Score: {card.trader_score}</p>
                </div>
                {card.display_price_pen && (
                  <p className="text-sm font-semibold text-emerald-600">S/ {card.display_price_pen}</p>
                )}
                {card.whatsapp && (
                  <a
                    href={`https://wa.me/${card.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
