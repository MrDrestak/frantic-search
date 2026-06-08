/**
 * Cierra automáticamente trade_interactions con status=PENDING
 * que llevan más de 10 días sin ser respondidas.
 * Ejecutado diariamente por GitHub Actions.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STALE_DAYS = 10;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/trade_interactions?status=eq.PENDING&created_at=lt.${encodeURIComponent(cutoff)}`,
  {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ status: 'IGNORED' }),
  }
);

if (!res.ok) {
  const body = await res.text();
  console.error(`Error ${res.status}: ${body}`);
  process.exit(1);
}

console.log(`OK — interacciones PENDING con más de ${STALE_DAYS} días cerradas (status → IGNORED).`);
