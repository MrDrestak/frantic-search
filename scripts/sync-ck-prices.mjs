import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CK_API_URL = 'https://api.cardkingdom.com/api/pricelist';
const CHUNK_SIZE = 1000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchPricelist() {
  console.log(`Fetching CK pricelist from ${CK_API_URL}...`);
  const res = await fetch(CK_API_URL, {
    headers: { 'Accept-Encoding': 'gzip' },
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`CK API returned ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (!Array.isArray(json?.data)) {
    throw new Error(`Unexpected CK response shape: ${JSON.stringify(json).slice(0, 200)}`);
  }

  return json.data;
}

function toRow(item) {
  return {
    scryfall_id: item.scryfall_id,
    ck_name: item.name ?? null,
    ck_edition: item.edition ?? null,
    price_buy_usd: item.price_buy != null ? Number(item.price_buy) : null,
    price_sell_usd: item.price_sell != null ? Number(item.price_sell) : null,
    qty_retail: item.qty_retail != null ? Number(item.qty_retail) : 0,
    last_updated: new Date().toISOString(),
  };
}

async function upsertChunk(rows, chunkIndex) {
  const { error } = await supabase
    .from('prices')
    .upsert(rows, { onConflict: 'scryfall_id' });

  if (error) {
    console.error(`  Chunk ${chunkIndex} failed: ${error.message}`);
    return 0;
  }

  return rows.length;
}

async function sync() {
  const data = await fetchPricelist();
  console.log(`  Total items from CK: ${data.length}`);

  const validItems = data.filter((item) => item.scryfall_id);
  const skipped = data.length - validItems.length;
  if (skipped > 0) console.log(`  Skipped ${skipped} items without scryfall_id`);

  let totalUpserted = 0;
  let totalFailed = 0;
  const chunks = Math.ceil(validItems.length / CHUNK_SIZE);

  for (let i = 0; i < validItems.length; i += CHUNK_SIZE) {
    const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
    const chunk = validItems.slice(i, i + CHUNK_SIZE);
    const rows = chunk.map(toRow);

    process.stdout.write(`  Upserting chunk ${chunkIndex}/${chunks} (${rows.length} rows)... `);
    const upserted = await upsertChunk(rows, chunkIndex);

    if (upserted > 0) {
      console.log('OK');
      totalUpserted += upserted;
    } else {
      console.log('FAILED');
      totalFailed += rows.length;
    }
  }

  console.log('');
  console.log(`Done.`);
  console.log(`  Upserted : ${totalUpserted}`);
  if (totalFailed > 0) {
    console.log(`  Failed   : ${totalFailed}`);
    process.exit(1);
  }
}

sync().catch((err) => {
  console.error('Fatal error:', err.message ?? err);
  process.exit(1);
});
