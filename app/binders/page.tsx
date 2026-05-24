'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { binderService } from '@/services/store';
import type { Binder, BinderType } from '@/types';
import type { Metadata } from 'next';

const TABS: { label: string; type: BinderType | 'ALL' }[] = [
  { label: 'Todos', type: 'ALL' },
  { label: 'Para Tradear', type: 'FOR_TRADE' },
  { label: 'Wishlist', type: 'WISHLIST' },
  { label: 'Subasta', type: 'AUCTION' },
];

export default function BindersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [binders, setBinders] = useState<Binder[]>([]);
  const [tab, setTab] = useState<BinderType | 'ALL'>('ALL');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    binderService.getUserBinders(user.id)
      .then(setBinders)
      .finally(() => setFetching(false));
  }, [user]);

  const visible = tab === 'ALL' ? binders : binders.filter((b) => b.type === tab);

  if (loading || fetching) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Mis Binders</h1>
        <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900">
          + Nuevo binder
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map(({ label, type }) => (
          <button
            key={type}
            onClick={() => setTab(type)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === type
                ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.length === 0 ? (
          <p className="col-span-full text-sm text-zinc-500">No tenés binders de este tipo todavía.</p>
        ) : (
          visible.map((binder) => (
            <Link
              key={binder.id}
              href={`/binders/${binder.id}`}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {binder.type}
                </span>
                <span className="text-xs text-zinc-400">{binder.card_count} cartas</span>
              </div>
              <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">{binder.name}</h3>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}
