import { newsService } from '@/services/store';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Noticias' };

export default async function NewsPage() {
  const news = await newsService.getNews();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Noticias MTG</h1>

      {news.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">No hay noticias disponibles.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <a
              key={item.id}
              href={item.link_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              {item.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt={item.title} className="h-44 w-full rounded-t-xl object-cover" />
              )}
              <div className="p-4">
                {item.source_name && (
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{item.source_name}</p>
                )}
                <h2 className="mt-1 text-sm font-semibold text-zinc-900 group-hover:underline dark:text-zinc-50">
                  {item.title}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {new Date(item.published_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long' })}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
