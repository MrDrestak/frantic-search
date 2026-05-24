'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { Metadata } from 'next';

// Metadata can't be exported from a 'use client' file; set it in a parent layout if needed.

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInAsGuest } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/binders');
  }, [user, loading, router]);

  function handleGuest() {
    const name = prompt('¿Cómo quieres llamarte?');
    if (name?.trim()) {
      signInAsGuest(name.trim());
      router.replace('/');
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Bienvenido</h1>
          <p className="mt-1 text-sm text-zinc-500">Ingresa para gestionar tus binders y subastas</p>
        </div>

        <button
          onClick={signInWithGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continuar con Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-xs text-zinc-400">
            <span className="bg-white px-2 dark:bg-zinc-900">o</span>
          </div>
        </div>

        <button
          onClick={handleGuest}
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Entrar como invitado
        </button>
      </div>
    </div>
  );
}
