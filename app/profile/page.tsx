'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/store';
import { useNotificationFeed } from '@/hooks/useNotificationFeed';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);
  const { notifications, unreadCount, markAllAsRead } = useNotificationFeed(user?.id ?? null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (user) setWhatsapp(user.whatsapp ?? '');
  }, [user, loading, router]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    await authService.updateProfile(user.id, { whatsapp });
    setSaving(false);
  }

  if (loading || !user) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-10">
      {/* Profile card */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          {user.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photo_url} alt={user.display_name} className="h-14 w-14 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{user.display_name}</h1>
            <p className="text-sm text-zinc-500">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {user.subscription_tier}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{user.trader_score}</p>
            <p className="text-xs text-zinc-500">Trader score</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{user.searcher_score}</p>
            <p className="text-xs text-zinc-500">Searcher score</p>
          </div>
        </div>
      </section>

      {/* Edit */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Datos de contacto</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-500">WhatsApp (solo números)</label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="51987654321"
              className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </section>

      {/* Notifications */}
      <section id="notifications" className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Notificaciones {unreadCount > 0 && <span className="ml-1 text-sm text-red-500">({unreadCount})</span>}
          </h2>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-xs text-zinc-400 hover:text-zinc-600">
              Marcar todas como leídas
            </button>
          )}
        </div>
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin notificaciones.</p>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <div
                key={n.id}
                className={`rounded-lg p-3 text-sm ${n.read ? 'bg-zinc-50 dark:bg-zinc-800' : 'bg-blue-50 dark:bg-blue-950'}`}
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{n.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{n.message}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
      <div className="h-32 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
