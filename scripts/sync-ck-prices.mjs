import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CK_API_URL = 'https://api.cardkingdom.com/api/pricelist';
const CHUNK_SIZE = 1000;

async function sync() {
  console.log('Fetching CK pricelist...');
  const response = await fetch(CK_API_URL);

  if (!response.ok) {
    console.error(`CK API error: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const data = await response.json();

  if (!data?.data?.length) {
    console.error('Invalid or empty CK response');
    process.exit(1);
  }

  console.log(`Processing ${data.data.length} items...`);

  const now = new Date().toISOString();
  let upserted = 0;
  let skipped = 0;

  // Deduplicate by scryfall_id — CK lists the same card multiple times across
  // editions. Keep the entry with the lowest sell price for each scryfall_id.
  const deduped = new Map();
  for (const item of data.data) {
    if (!item.scryfall_id) { skipped++; continue; }
    const existing = deduped.get(item.scryfall_id);
    const newSell = item.price_sell ?? Infinity;
    const oldSell = existing?.price_sell ?? Infinity;
    if (!existing || newSell < oldSell) deduped.set(item.scryfall_id, item);
  }

  const allRows = Array.from(deduped.values()).map(item => ({
    scryfall_id: item.scryfall_id,
    ck_name: item.name,
    ck_edition: item.edition,
    price_buy_usd: item.price_buy ?? null,
    price_sell_usd: item.price_sell ?? null,
    qty_retail: item.qty_retail ?? 0,
    last_updated: now,
  }));

  console.log(`Unique scryfall_ids: ${allRows.length} | Skipped (no scryfall_id): ${skipped}`);

  for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
    const rows = allRows.slice(i, i + CHUNK_SIZE);

    if (rows.length === 0) continue;

    const { error } = await supabase
      .from('prices')
      .upsert(rows, { onConflict: 'scryfall_id' });

    if (error) {
      console.error(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1} failed:`, error.message);
    } else {
      upserted += rows.length;
    }
  }

  console.log(`Done. Upserted: ${upserted} | Skipped (no scryfall_id): ${skipped} | Duplicates removed: ${data.data.length - skipped - allRows.length}`);
}

sync().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
