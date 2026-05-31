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

  for (let i = 0; i < data.data.length; i += CHUNK_SIZE) {
    const chunk = data.data.slice(i, i + CHUNK_SIZE);
    const rows = chunk
      .filter(item => item.scryfall_id)
      .map(item => ({
        scryfall_id: item.scryfall_id,
        ck_name: item.name,
        ck_edition: item.edition,
        price_buy_usd: item.price_buy ?? null,
        price_sell_usd: item.price_sell ?? null,
        qty_retail: item.qty_retail ?? 0,
        last_updated: now,
      }));

    skipped += chunk.length - rows.length;

    if (rows.length === 0) continue;

    const { error } = await supabase
      .from('prices')
      .upsert(rows, { onConflict: 'scryfall_id' });

    if (error) {
      console.error(`Chunk ${i / CHUNK_SIZE + 1} failed:`, error.message);
    } else {
      upserted += rows.length;
    }
  }

  console.log(`Done. Upserted: ${upserted} | Skipped (no scryfall_id): ${skipped}`);
}

sync().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
