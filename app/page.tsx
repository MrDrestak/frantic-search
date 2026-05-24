import { showcaseService, newsService } from '@/services/store';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Inicio' };

export default async function HomePage() {
  const [showcase, news] = await Promise.all([
    showcaseService.getShowcaseItems(),
    newsService.getNews(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-12">
      {/* Showcase */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">Showcase</h2>
        {showcase.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay cartas en showcase todavía.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {showcase.map((card) => (
              <div key={card.id} className="rounded-lg border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                {card.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image_url} alt={card.name} className="w-full rounded" />
                )}
                <p className="mt-1 truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">{card.name}</p>
                <p className="text-xs text-zinc-500">{card.seller_name}</p>
                {card.display_price_pen && (
                  <p className="text-xs font-semibold text-emerald-600">S/ {card.display_price_pen}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* News */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">Noticias</h2>
        {news.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay noticias disponibles.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => (
              <a
                key={item.id}
                href={item.link_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.title} className="mb-3 h-36 w-full rounded object-cover" />
                )}
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{item.source_name}</p>
                <h3 className="mt-1 text-sm font-semibold text-zinc-900 group-hover:underline dark:text-zinc-50">
                  {item.title}
                </h3>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
