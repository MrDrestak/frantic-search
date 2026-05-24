'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationFeed } from '@/hooks/useNotificationFeed';

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/market-match', label: 'Market Match' },
  { href: '/auctions', label: 'Subastas' },
  { href: '/news', label: 'Noticias' },
  { href: '/stores', label: 'Tiendas' },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, guest, isAdmin, loading, signOut } = useAuth();
  const { unreadCount } = useNotificationFeed(user?.id ?? null);

  const displayName = user?.display_name ?? guest?.display_name;

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <nav className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        {/* Logo */}
        <Link href="/" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Frantic Search
        </Link>

        {/* Main links */}
        <div className="hidden flex-1 items-center gap-1 sm:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Auth section */}
        <div className="ml-auto flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
          ) : displayName ? (
            <>
              {user && (
                <Link href="/binders" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                  Mis Binders
                </Link>
              )}
              {/* Notifications */}
              {user && (
                <Link href="/profile#notifications" className="relative">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="text-sm font-medium text-amber-600 hover:text-amber-700">
                  Admin
                </Link>
              )}
              <Link href="/profile" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {displayName}
              </Link>
              {user && (
                <button
                  onClick={handleSignOut}
                  className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Salir
                </button>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Ingresar
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
