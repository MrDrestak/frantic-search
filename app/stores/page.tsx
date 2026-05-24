import { storeDirectoryService } from '@/services/store';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tiendas' };

export default async function StoresPage() {
  const stores = await storeDirectoryService.getStores();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Directorio de Tiendas</h1>

      {stores.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">No hay tiendas registradas todavía.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <div
              key={store.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center gap-3">
                {store.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.logo_url} alt={store.name} className="h-10 w-10 rounded-lg object-contain" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                )}
                <div>
                  <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{store.name}</h2>
                  {store.location && <p className="text-xs text-zinc-500">{store.location}</p>}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {store.website_url && (
                  <a href={store.website_url} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400">
                    Web
                  </a>
                )}
                {store.maps_url && (
                  <a href={store.maps_url} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400">
                    Maps
                  </a>
                )}
              </div>

              {store.default_multiplier && (
                <p className="mt-2 text-xs text-zinc-400">Multiplicador: ×{store.default_multiplier}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
