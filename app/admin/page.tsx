'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

const ADMIN_SECTIONS = [
  { label: 'Usuarios y tiers', description: 'Asignar tiers de suscripción por email', href: '#tiers' },
  { label: 'Tiendas', description: 'Agregar o editar tiendas en el directorio', href: '#stores' },
  { label: 'Noticias', description: 'Publicar y eliminar noticias', href: '#news' },
  { label: 'Reportes', description: 'Revisar reportes abiertos de usuarios', href: '#reports' },
  { label: 'Configuración global', description: 'Editar límites por tier y multiplicador default', href: '#config' },
];

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/');
  }, [user, isAdmin, loading, router]);

  if (loading) return <PageSkeleton />;
  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Panel de administración</h1>
      <p className="mt-1 text-sm text-zinc-500">Bienvenido, {user?.display_name}.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ADMIN_SECTIONS.map(({ label, description, href }) => (
          <a
            key={href}
            href={href}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{label}</h2>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}
