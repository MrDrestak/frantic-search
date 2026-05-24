'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { tradeService } from '@/services/store';
import type { TradeInteraction, FeedbackValue } from '@/types';

const FEEDBACK_OPTIONS: { value: FeedbackValue; label: string }[] = [
  { value: 'EXCELENTE', label: '⭐ Excelente' },
  { value: 'BUENO', label: '👍 Bueno' },
  { value: 'MALO', label: '👎 Malo' },
  { value: 'NO_CONCRETADO', label: '❌ No concretado' },
];

export default function TradesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [interactions, setInteractions] = useState<TradeInteraction[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    tradeService.getUserInteractions(user.id).then(setInteractions).finally(() => setFetching(false));
  }, [user]);

  async function submitFeedback(interactionId: string, feedback: FeedbackValue) {
    if (!user) return;
    await tradeService.submitFeedback(interactionId, user.id, feedback);
    setInteractions((prev) =>
      prev.map((i) => {
        if (i.id !== interactionId) return i;
        return i.buyer_id === user.id
          ? { ...i, buyer_feedback: feedback }
          : { ...i, seller_feedback: feedback };
      })
    );
  }

  if (loading || fetching) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Mis Trades</h1>

      <div className="mt-6 space-y-3">
        {interactions.length === 0 ? (
          <p className="text-sm text-zinc-500">No tenés trades registrados todavía.</p>
        ) : (
          interactions.map((interaction) => {
            const isBuyer = interaction.buyer_id === user?.id;
            const myFeedback = isBuyer ? interaction.buyer_feedback : interaction.seller_feedback;
            const counterpart = isBuyer ? interaction.seller_name : interaction.buyer_name;

            return (
              <div key={interaction.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{interaction.card_name}</p>
                    <p className="text-xs text-zinc-500">
                      {isBuyer ? 'Compraste a' : 'Vendiste a'} {counterpart}
                    </p>
                    <p className="text-xs text-zinc-400">{new Date(interaction.created_at).toLocaleDateString('es-PE')}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    interaction.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                    interaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-zinc-100 text-zinc-600'
                  }`}>
                    {interaction.status}
                  </span>
                </div>

                {interaction.status === 'PENDING' && !myFeedback && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-zinc-500 mb-2">¿Cómo resultó el trade?</p>
                    <div className="flex gap-2 flex-wrap">
                      {FEEDBACK_OPTIONS.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => submitFeedback(interaction.id, value)}
                          className="rounded-lg border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {myFeedback && (
                  <p className="mt-2 text-xs text-zinc-400">
                    Tu feedback: <span className="font-medium">{myFeedback}</span>
                  </p>
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
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-3">
      <div className="h-8 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      ))}
    </div>
  );
}
