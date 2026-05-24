# Claude Code Migration Brief: Firestore → Supabase

## Context

This is a migration of the **Frantic Search** TCG marketplace from Firebase/Firestore to Supabase/Postgres. The app is a React 18 + Vite SPA with an Express backend. The target is a Next.js + Supabase architecture on Vercel.

**Current stack:** React 18 + Vite + Express + Firebase Auth + Firestore
**Target stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Realtime)

**The app has 0 users.** There is no data to migrate. This is a clean rewrite of the data layer.

---

## Files to modify/replace

| Current file | Action | New file |
|---|---|---|
| `services/firebase.ts` | **DELETE** | `services/supabase.ts` |
| `services/store.ts` | **REWRITE** | `services/store.ts` (same API surface, Supabase backend) |
| `server.ts` | **DELETE** | Replaced by Next.js API routes + GitHub Actions cron |
| `types.ts` | **UPDATE** | Align with Postgres enums, add new types |
| `App.tsx` | **UPDATE** | Replace routing with Next.js App Router |

---

## Schema

The full Postgres schema is in `schema.sql` in this repo. Key tables:

- `users` — profile + subscription + reputation + multiplier
- `binders` — card containers (trade, wishlist, auction)
- `cards` — individual card listings with optional auction fields
- `prices` — **NEW** normalized CK price table (1 row per scryfall_id)
- `bids` — **NEW** auction bid history
- `trade_interactions` — feedback/reputation system
- `reports` — **NEW** moderation system
- `notifications` — push notification queue
- `card_alerts` — wishlist watchers
- `stores` — LGS partner directory
- `news` — admin-managed news feed
- `settings` — key-value config (JSONB)

---

## Migration steps (in order)

### Step 1: Initialize Supabase project

```bash
# In Supabase Dashboard:
# 1. Create new project (region: sa-east-1 or us-east-1)
# 2. Copy: Project URL, anon key, service_role key
# 3. Enable Google OAuth in Auth > Providers
# 4. Run schema.sql in SQL Editor
```

### Step 2: Create `services/supabase.ts`

Replace `services/firebase.ts` with:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

For server-side operations (cron, admin):
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseServiceRole = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Step 3: Rewrite `services/store.ts`

**CRITICAL: Preserve the same export API surface.** The views (`Binders.tsx`, `MarketMatch.tsx`, etc.) import from `store.ts`. The less they change, the faster the migration.

Mapping of each service:

#### `auth` service

| Firestore | Supabase |
|---|---|
| `firebaseAuth.signInWithPopup(googleProvider)` | `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| `firebaseAuth.onAuthStateChanged(cb)` | `supabase.auth.onAuthStateChange((event, session) => ...)` |
| `firebaseAuth.signOut()` | `supabase.auth.signOut()` |
| `db.collection("users").doc(uid).set(...)` | `supabase.from('users').upsert({...})` |
| `db.collection("users").doc(uid).get()` | `supabase.from('users').select('*').eq('id', uid).single()` |

**Guest login:** Keep as localStorage-only (no DB writes). Same pattern.

**On first login (new user):** Supabase Auth creates the `auth.users` row. The app must INSERT into the public `users` table via an `on('SIGNED_IN')` handler or a Postgres trigger.

Recommended: Use a Supabase **Database Function + Trigger** to auto-create the profile:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, photo_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed Trader'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

#### `configService`

| Firestore | Supabase |
|---|---|
| `db.collection("settings").doc("global").get()` | `supabase.from('settings').select('value').eq('key', 'global_config').single()` |
| `.doc("global").set(newConfig)` | `supabase.from('settings').update({ value: newConfig }).eq('key', 'global_config')` |

Same pattern for `system_config`.

#### `binderService`

| Firestore | Supabase |
|---|---|
| `.where("userId", "==", userId).get()` | `.from('binders').select('*').eq('user_id', userId)` |
| `.doc(binderId).get()` | `.from('binders').select('*').eq('id', binderId).single()` |
| `.add(newBinder)` | `.from('binders').insert(newBinder).select().single()` |
| `.doc(binderId).delete()` | `.from('binders').delete().eq('id', binderId)` |

**Cascade delete of cards** is handled by the DB foreign key (`ON DELETE CASCADE`), so `deleteBinder` no longer needs to manually delete cards.

#### `cardService`

| Firestore | Supabase |
|---|---|
| `.where("binderId", "==", binderId).get()` | `.from('cards').select('*').eq('binder_id', binderId)` |
| `.add(newCard)` | `.from('cards').insert(newCard).select().single()` |
| `.doc(cardId).delete()` | `.from('cards').delete().eq('id', cardId)` |

**Card count update** is handled by the DB trigger (`tr_cards_count`), so `addCard` and `removeCard` no longer need to manually increment/decrement.

**Price lookup:** Instead of reading `card.price` (which was the duplicated CK price), join with the `prices` table:

```typescript
const { data: cards } = await supabase
  .from('cards')
  .select(`
    *,
    prices!cards_scryfall_id_fkey (
      price_sell_usd,
      ck_name,
      ck_edition
    )
  `)
  .eq('binder_id', binderId);
```

Or use the `v_tradeable_cards` view for marketplace queries.

#### `auctionService`

**placeBid** must be a Postgres transaction to prevent race conditions:

```typescript
// Use a Supabase RPC (server-side function) for atomic bid placement
const { data, error } = await supabase.rpc('place_bid', {
  p_card_id: cardId,
  p_user_id: userId,
  p_amount: newBid
});
```

Create the corresponding Postgres function (add to schema.sql):

```sql
CREATE OR REPLACE FUNCTION place_bid(
  p_card_id UUID,
  p_user_id UUID,
  p_amount NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_card RECORD;
  v_new_end TIMESTAMPTZ;
BEGIN
  -- Lock the card row
  SELECT * INTO v_card FROM cards WHERE id = p_card_id FOR UPDATE;
  
  IF v_card IS NULL THEN RAISE EXCEPTION 'Card not found'; END IF;
  IF v_card.auction_status != 'ACTIVE' THEN RAISE EXCEPTION 'AUCTION_ENDED'; END IF;
  IF v_card.auction_end_date < NOW() THEN RAISE EXCEPTION 'AUCTION_ENDED'; END IF;
  IF p_amount <= v_card.current_bid THEN RAISE EXCEPTION 'BID_TOO_LOW'; END IF;
  IF v_card.user_id = p_user_id THEN RAISE EXCEPTION 'SELF_BID_FORBIDDEN'; END IF;
  
  -- Overtime check
  v_new_end := v_card.auction_end_date;
  IF v_card.auction_end_date - NOW() < INTERVAL '5 minutes' THEN
    v_new_end := NOW() + INTERVAL '5 minutes';
  END IF;
  
  -- Update card
  UPDATE cards SET
    current_bid = p_amount,
    top_bidder_id = p_user_id,
    bid_count = bid_count + 1,
    auction_end_date = v_new_end
  WHERE id = p_card_id;
  
  -- Record bid
  INSERT INTO bids (card_id, user_id, amount) VALUES (p_card_id, p_user_id, p_amount);
END;
$$ LANGUAGE plpgsql;
```

#### `matchingService`

The current implementation is N+1 heavy. With Postgres, this becomes a single query:

```typescript
const { data: matches } = await supabase
  .from('cards')
  .select(`
    *,
    prices (price_sell_usd),
    users!cards_user_id_fkey (display_name, trader_score, whatsapp, subscription_tier)
  `)
  .in('name', wishlistCardNames)
  .eq('binder_type', 'FOR_TRADE')
  .neq('user_id', currentUserId);
```

This replaces ~20 Firestore reads with 1 SQL query. Major performance win.

#### `tradeService`

Direct translation. The `submitFeedback` function already uses `db.runTransaction()` which maps to a Supabase RPC:

```sql
CREATE OR REPLACE FUNCTION submit_feedback(
  p_interaction_id UUID,
  p_user_id UUID,
  p_feedback feedback_value
) RETURNS VOID AS $$
DECLARE
  v_interaction RECORD;
  v_is_buyer BOOLEAN;
  v_buyer_award INTEGER := 0;
  v_seller_award INTEGER := 0;
BEGIN
  SELECT * INTO v_interaction FROM trade_interactions 
  WHERE id = p_interaction_id FOR UPDATE;
  
  IF v_interaction IS NULL THEN RAISE EXCEPTION 'Interaction not found'; END IF;
  
  v_is_buyer := v_interaction.buyer_id = p_user_id;
  
  IF v_is_buyer THEN
    UPDATE trade_interactions SET 
      buyer_feedback = p_feedback, 
      buyer_confirmed_at = NOW()
    WHERE id = p_interaction_id;
  ELSE
    UPDATE trade_interactions SET 
      seller_feedback = p_feedback, 
      seller_confirmed_at = NOW()
    WHERE id = p_interaction_id;
  END IF;
  
  -- Check if both have answered
  SELECT * INTO v_interaction FROM trade_interactions WHERE id = p_interaction_id;
  
  IF v_interaction.buyer_feedback IS NOT NULL AND v_interaction.seller_feedback IS NOT NULL THEN
    -- Calculate awards (same logic as current store.ts)
    IF v_interaction.buyer_feedback != 'NO_CONCRETADO' AND v_interaction.seller_feedback = 'NO_CONCRETADO' THEN
      v_buyer_award := 1; v_seller_award := 1;
    ELSIF v_interaction.buyer_feedback != 'NO_CONCRETADO' AND v_interaction.seller_feedback != 'NO_CONCRETADO' THEN
      v_seller_award := CASE v_interaction.buyer_feedback
        WHEN 'MALO' THEN -2 WHEN 'BUENO' THEN 1 WHEN 'EXCELENTE' THEN 3 ELSE 0 END;
      v_buyer_award := CASE v_interaction.seller_feedback
        WHEN 'MALO' THEN -2 WHEN 'BUENO' THEN 1 WHEN 'EXCELENTE' THEN 3 ELSE 0 END;
    END IF;
    
    IF v_buyer_award != 0 THEN
      UPDATE users SET searcher_score = searcher_score + v_buyer_award WHERE id = v_interaction.buyer_id;
    END IF;
    IF v_seller_award != 0 THEN
      UPDATE users SET trader_score = trader_score + v_seller_award WHERE id = v_interaction.seller_id;
    END IF;
    
    UPDATE trade_interactions SET status = 'COMPLETED' WHERE id = p_interaction_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

#### Remaining services (direct translation)

- `notificationService` → `.from('notifications').insert(...)` / `.update(...)` / `.delete(...)`
- `alertService` → `.from('card_alerts').insert(...)` / `.delete(...)` / `.select(...)`
- `newsService` → `.from('news').select(...)` / `.insert(...)` / `.delete(...)`
- `storeDirectoryService` → `.from('stores').select(...)` / `.insert(...)` / `.delete(...)`
- `showcaseService` → `.from('cards').select('*, users(display_name)').eq('is_showcase', true)`
- `adminService.assignTierByEmail` → `.from('users').update({subscription_tier}).eq('email', email)`
- `adminService.wipeDatabase` → Use Supabase service role with TRUNCATE (admin-only, protected)

### Step 4: CK Price Sync (GitHub Actions)

Create `.github/workflows/sync-ck-prices.yml`:

```yaml
name: Sync CK Prices
on:
  schedule:
    - cron: '0 9 * * *'  # 4:00 AM PET = 9:00 AM UTC
  workflow_dispatch:       # manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: node scripts/sync-ck-prices.mjs
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

Create `scripts/sync-ck-prices.mjs`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CK_API_URL = 'https://api.cardkingdom.com/api/pricelist';

async function sync() {
  console.log('Fetching CK pricelist...');
  const response = await fetch(CK_API_URL);
  const data = await response.json();
  
  if (!data?.data) {
    console.error('Invalid CK response');
    process.exit(1);
  }
  
  console.log(`Processing ${data.data.length} items...`);
  
  // Process in chunks of 1000
  const CHUNK_SIZE = 1000;
  let upserted = 0;
  
  for (let i = 0; i < data.data.length; i += CHUNK_SIZE) {
    const chunk = data.data.slice(i, i + CHUNK_SIZE);
    const rows = chunk
      .filter(item => item.scryfall_id)
      .map(item => ({
        scryfall_id: item.scryfall_id,
        ck_name: item.name,
        ck_edition: item.edition,
        price_buy_usd: item.price_buy || null,
        price_sell_usd: item.price_sell || null,
        qty_retail: item.qty_retail || 0,
        last_updated: new Date().toISOString()
      }));
    
    const { error } = await supabase
      .from('prices')
      .upsert(rows, { onConflict: 'scryfall_id' });
    
    if (error) {
      console.error(`Chunk ${i} failed:`, error.message);
    } else {
      upserted += rows.length;
    }
  }
  
  console.log(`Done. Upserted ${upserted} prices.`);
}

sync().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

**Key improvements over current server.ts approach:**
- No 100MB JSON in memory (streamed processing in chunks)
- Runs in isolated GitHub Actions environment (no impact on web server)
- `UPSERT` with `onConflict: 'scryfall_id'` handles both inserts and updates
- Prices are in their own table — no need to update every user's card document
- If it fails, you get a GitHub notification

### Step 5: Remove `experimentalForceLongPolling`

This is deleted automatically when `firebase.ts` is deleted. Supabase uses standard WebSocket connections for realtime.

### Step 6: Enable Realtime

In Supabase Dashboard > Database > Realtime:
- Enable for `cards` table (for live auction updates)
- Enable for `notifications` table (for toast alerts)
- Enable for `bids` table (for bid feed in auction view)

In the client:

```typescript
// Subscribe to auction updates
const channel = supabase
  .channel('auction-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'cards',
    filter: `id=eq.${cardId}`
  }, (payload) => {
    // Update local state with new bid
    setCurrentBid(payload.new.current_bid);
    setTopBidder(payload.new.top_bidder_id);
    setEndDate(payload.new.auction_end_date);
  })
  .subscribe();
```

### Step 7: Next.js migration (can be parallel)

This is optional for Sprint 1 but recommended. The minimum viable approach:

1. `npx create-next-app@latest frantic-search-v2 --typescript --app --tailwind`
2. Copy all `/views` and `/components` to `/app` directory
3. Convert `App.tsx` routing to Next.js file-based routing
4. Move API routes to `/app/api/` (prices endpoint, health check)

If you want to stay with Vite for now, you can — Supabase client works in any React app. The Next.js migration can happen in a later sprint.

---

## Testing checklist

After migration, verify:

- [ ] Google OAuth login works
- [ ] Profile create/update/read
- [ ] Create binder (trade, wishlist, auction)
- [ ] Add card to binder (with Scryfall search)
- [ ] Card count updates automatically
- [ ] Tier limits enforced (try exceeding binder/card limits)
- [ ] Market Match returns correct results
- [ ] Showcase displays cards marked as showcase
- [ ] Auction: create, bid, overtime extension, direct buy
- [ ] Feedback: log interaction, submit dual feedback, reputation updates
- [ ] Notifications: created on bid, on wish alert, on system event
- [ ] Card alerts: toggle on/off, trigger on new listing
- [ ] Admin: change user tier, manage stores, manage news
- [ ] CK prices: run sync script, verify prices table populated
- [ ] Multiplier: global default works, user override works, store override works
- [ ] Price display: shows CK USD + PEN with multiplier + custom price
- [ ] RLS: user A cannot update user B's cards/binders
- [ ] Binder delete cascades to cards
- [ ] Settings: load/save global config and system config

---

## Environment variables needed

```env
# .env.local (Vercel + local dev)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # server-side only, never expose

# GitHub Actions secrets
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## What NOT to change (preserve as-is)

- OneSignal push notification integration
- Scryfall API search (client-side, works fine)
- All view components (`Binders.tsx`, `MarketMatch.tsx`, etc.) — only their import from `store.ts` matters
- UI/styling — no visual changes in this migration
- WhatsApp contact flow
