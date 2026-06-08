-- =============================================================================
-- FRANTIC SEARCH — Supabase/Postgres Schema v1.1
-- =============================================================================
-- Target: Supabase (Postgres 15+)
-- Generated from Firestore model in store.ts + types.ts
-- Change from v1.0: multiplier moved from user-level to binder-level
-- Date: May 2026
-- =============================================================================

-- ─────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ─────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────────────────────────

CREATE TYPE game_type AS ENUM ('MTG');
CREATE TYPE binder_type AS ENUM ('FOR_TRADE', 'WISHLIST', 'AUCTION');
CREATE TYPE card_condition AS ENUM ('NM', 'LP', 'MP', 'HP', 'DMG');
CREATE TYPE subscription_tier AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'MYTHIC');
CREATE TYPE auction_status AS ENUM ('ACTIVE', 'SOLD', 'ENDED');
CREATE TYPE currency_type AS ENUM ('USD', 'PEN');
CREATE TYPE feedback_value AS ENUM ('MALO', 'BUENO', 'EXCELENTE', 'NO_CONCRETADO');
CREATE TYPE trade_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'IGNORED');
CREATE TYPE notification_type AS ENUM ('OUTBID', 'WISH_ALERT', 'SYSTEM');
CREATE TYPE report_reason AS ENUM ('SCAM', 'NOT_SHIPPED', 'DAMAGED_UNDECLARED', 'ABUSIVE', 'OTHER');
CREATE TYPE report_status AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');


-- ─────────────────────────────────────────────────────────────
-- 2. CORE TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    display_name    TEXT NOT NULL DEFAULT 'Unnamed Trader',
    photo_url       TEXT,
    whatsapp        TEXT,
    preferred_store UUID,
    preferred_game  game_type DEFAULT 'MTG',
    store_announcement TEXT,
    subscription_tier subscription_tier NOT NULL DEFAULT 'COMMON',
    trial_ends_at     TIMESTAMPTZ,
    trader_score    INTEGER NOT NULL DEFAULT 0,
    searcher_score  INTEGER NOT NULL DEFAULT 0,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(subscription_tier);


CREATE TABLE stores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    logo_url        TEXT,
    website_url     TEXT,
    maps_url        TEXT,
    location        TEXT,
    games           game_type[] NOT NULL DEFAULT '{MTG}',
    default_multiplier NUMERIC(3,1) DEFAULT 3.0
        CHECK (default_multiplier BETWEEN 1.5 AND 5.0),
    linked_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD CONSTRAINT fk_users_preferred_store
    FOREIGN KEY (preferred_store) REFERENCES stores(id) ON DELETE SET NULL;


CREATE TABLE prices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scryfall_id     TEXT NOT NULL,
    ck_name         TEXT,
    ck_edition      TEXT,
    price_buy_usd   NUMERIC(10,2),
    price_sell_usd  NUMERIC(10,2),
    qty_retail      INTEGER,
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(scryfall_id)
);

CREATE INDEX idx_prices_scryfall ON prices(scryfall_id);
CREATE INDEX idx_prices_name ON prices USING gin (ck_name gin_trgm_ops);


CREATE TABLE binders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game            game_type NOT NULL DEFAULT 'MTG',
    type            binder_type NOT NULL,
    name            TEXT NOT NULL,
    cover_image     TEXT,
    card_count      INTEGER NOT NULL DEFAULT 0,
    -- v1.1: Multiplier lives at binder level (CK USD × multiplier = PEN)
    -- NULL = use global default from settings.system_config.defaultMultiplier
    -- Only relevant for FOR_TRADE and AUCTION binders
    price_multiplier NUMERIC(3,1)
        CHECK (price_multiplier BETWEEN 1.5 AND 5.0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_binders_user ON binders(user_id);
CREATE INDEX idx_binders_user_type ON binders(user_id, type);


CREATE TABLE cards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    binder_id       UUID NOT NULL REFERENCES binders(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scryfall_id     TEXT NOT NULL,
    name            TEXT NOT NULL,
    set_name        TEXT,
    collector_number TEXT,
    image_url       TEXT,
    rarity          TEXT,
    game            game_type NOT NULL DEFAULT 'MTG',
    condition       card_condition NOT NULL DEFAULT 'NM',
    is_foil         BOOLEAN NOT NULL DEFAULT FALSE,
    quantity        INTEGER NOT NULL DEFAULT 1,
    -- User-defined price override (takes priority over CK × multiplier)
    custom_price    NUMERIC(10,2),
    currency        currency_type DEFAULT 'PEN',
    binder_type     binder_type,
    is_showcase     BOOLEAN NOT NULL DEFAULT FALSE,
    purchase_url    TEXT,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Auction fields (only for binder_type = AUCTION)
    auction_end_date TIMESTAMPTZ,
    base_price      NUMERIC(10,2),
    buy_it_now_price NUMERIC(10,2),
    auction_currency currency_type DEFAULT 'USD',
    current_bid     NUMERIC(10,2),
    top_bidder_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    bid_count       INTEGER NOT NULL DEFAULT 0,
    auction_status  auction_status,
    winner_id       UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_cards_binder ON cards(binder_id);
CREATE INDEX idx_cards_user ON cards(user_id);
CREATE INDEX idx_cards_scryfall ON cards(scryfall_id);
CREATE INDEX idx_cards_name ON cards USING gin (name gin_trgm_ops);
CREATE INDEX idx_cards_showcase ON cards(is_showcase) WHERE is_showcase = TRUE;
CREATE INDEX idx_cards_auction ON cards(auction_status) WHERE auction_status = 'ACTIVE';
CREATE INDEX idx_cards_binder_type ON cards(binder_type);
CREATE INDEX idx_cards_matching ON cards(name, binder_type);


CREATE TABLE bids (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id         UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          NUMERIC(10,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bids_card ON bids(card_id);
CREATE INDEX idx_bids_user ON bids(user_id);


-- ─────────────────────────────────────────────────────────────
-- 3. INTERACTION & REPUTATION TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE trade_interactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_name      TEXT NOT NULL,
    seller_name     TEXT NOT NULL,
    card_name       TEXT DEFAULT 'General Inquiry',
    status          trade_status NOT NULL DEFAULT 'PENDING',
    buyer_feedback      feedback_value,
    seller_feedback     feedback_value,
    buyer_confirmed_at  TIMESTAMPTZ,
    seller_confirmed_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trade_buyer ON trade_interactions(buyer_id);
CREATE INDEX idx_trade_seller ON trade_interactions(seller_id);
CREATE INDEX idx_trade_status ON trade_interactions(status);
CREATE INDEX idx_trade_pending ON trade_interactions(buyer_id, status) WHERE status = 'PENDING';


CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason          report_reason NOT NULL,
    description     TEXT,
    related_card_id         UUID REFERENCES cards(id) ON DELETE SET NULL,
    related_interaction_id  UUID REFERENCES trade_interactions(id) ON DELETE SET NULL,
    status          report_status NOT NULL DEFAULT 'OPEN',
    admin_notes     TEXT,
    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_reported ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);


-- ─────────────────────────────────────────────────────────────
-- 4. NOTIFICATION & ALERT TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    link_url        TEXT,
    image_url       TEXT,
    read            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;


CREATE TABLE card_alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_name       TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, card_name)
);

CREATE INDEX idx_alerts_cardname ON card_alerts(card_name);


-- ─────────────────────────────────────────────────────────────
-- 5. CONTENT & CONFIG TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE news (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    image_url       TEXT,
    link_url        TEXT,
    game            game_type NOT NULL DEFAULT 'MTG',
    source_name     TEXT,
    published_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE settings (
    key             TEXT PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
('global_config', '{
    "COMMON": {
        "maxTradeBinders": 1,
        "maxCardsPerTradeBinder": 25,
        "maxWishlistBinders": 3,
        "maxCardsPerWishlistBinder": 25,
        "maxAuctionBinders": 1,
        "maxAuctionCardsPerBinder": 1,
        "maxShowcaseItems": 1,
        "maxCardAlerts": 3,
        "pricePerMonth": 0,
        "currency": "PEN"
    },
    "UNCOMMON": {
        "maxTradeBinders": 5,
        "maxCardsPerTradeBinder": 50,
        "maxWishlistBinders": 10,
        "maxCardsPerWishlistBinder": 50,
        "maxAuctionBinders": 2,
        "maxAuctionCardsPerBinder": 10,
        "maxShowcaseItems": 5,
        "maxCardAlerts": 5,
        "pricePerMonth": 5,
        "currency": "PEN"
    },
    "RARE": {
        "maxTradeBinders": 15,
        "maxCardsPerTradeBinder": 75,
        "maxWishlistBinders": 10,
        "maxCardsPerWishlistBinder": 75,
        "maxAuctionBinders": 5,
        "maxAuctionCardsPerBinder": 10,
        "maxShowcaseItems": 10,
        "maxCardAlerts": 10,
        "pricePerMonth": 10,
        "currency": "PEN"
    },
    "MYTHIC": {
        "maxTradeBinders": 100,
        "maxCardsPerTradeBinder": 500,
        "maxWishlistBinders": 0,
        "maxCardsPerWishlistBinder": 0,
        "maxAuctionBinders": 10,
        "maxAuctionCardsPerBinder": 50,
        "maxShowcaseItems": 500,
        "maxCardAlerts": 100,
        "pricePerMonth": 0,
        "currency": "PEN"
    }
}'::jsonb),
('system_config', '{
    "minTradeConfirmHours": 0,
    "maxTradeConfirmHours": 1,
    "defaultMultiplier": 3.0
}'::jsonb);


-- ─────────────────────────────────────────────────────────────
-- 6. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_settings_updated_at
    BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE OR REPLACE FUNCTION update_binder_card_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE binders SET card_count = card_count + 1 WHERE id = NEW.binder_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE binders SET card_count = card_count - 1 WHERE id = OLD.binder_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_cards_count
    AFTER INSERT OR DELETE ON cards FOR EACH ROW EXECUTE FUNCTION update_binder_card_count();


-- Get the effective multiplier for a binder
-- Cascade: binder.price_multiplier > settings.defaultMultiplier
CREATE OR REPLACE FUNCTION get_binder_multiplier(p_binder_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_binder_mult NUMERIC;
    v_global_mult NUMERIC;
BEGIN
    SELECT price_multiplier INTO v_binder_mult
    FROM binders WHERE id = p_binder_id;

    IF v_binder_mult IS NOT NULL THEN RETURN v_binder_mult; END IF;

    SELECT (value->>'defaultMultiplier')::NUMERIC INTO v_global_mult
    FROM settings WHERE key = 'system_config';

    RETURN COALESCE(v_global_mult, 3.0);
END;
$$ LANGUAGE plpgsql STABLE;


-- Calculate display price in PEN for a card
-- 1. custom_price set → return custom_price
-- 2. Otherwise → CK price_sell_usd × binder multiplier
CREATE OR REPLACE FUNCTION get_card_price_pen(
    p_scryfall_id TEXT,
    p_binder_id UUID,
    p_custom_price NUMERIC DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
    v_ck_price NUMERIC;
    v_mult NUMERIC;
BEGIN
    IF p_custom_price IS NOT NULL THEN
        RETURN p_custom_price;
    END IF;

    SELECT price_sell_usd INTO v_ck_price
    FROM prices WHERE scryfall_id = p_scryfall_id;

    IF v_ck_price IS NULL THEN RETURN NULL; END IF;

    v_mult := get_binder_multiplier(p_binder_id);

    RETURN ROUND(v_ck_price * v_mult, 2);
END;
$$ LANGUAGE plpgsql STABLE;


-- Atomic bid placement with overtime logic
CREATE OR REPLACE FUNCTION place_bid(
    p_card_id UUID,
    p_user_id UUID,
    p_amount NUMERIC
)
RETURNS VOID AS $$
DECLARE
    v_card RECORD;
    v_new_end TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_card FROM cards WHERE id = p_card_id FOR UPDATE;

    IF v_card IS NULL THEN RAISE EXCEPTION 'Card not found'; END IF;
    IF v_card.auction_status != 'ACTIVE' THEN RAISE EXCEPTION 'AUCTION_ENDED'; END IF;
    IF v_card.auction_end_date IS NOT NULL AND v_card.auction_end_date < NOW() THEN
        RAISE EXCEPTION 'AUCTION_ENDED';
    END IF;
    IF p_amount <= COALESCE(v_card.current_bid, 0) THEN RAISE EXCEPTION 'BID_TOO_LOW'; END IF;
    IF v_card.user_id = p_user_id THEN RAISE EXCEPTION 'SELF_BID_FORBIDDEN'; END IF;

    v_new_end := v_card.auction_end_date;
    IF v_card.auction_end_date IS NOT NULL
       AND v_card.auction_end_date - NOW() < INTERVAL '5 minutes' THEN
        v_new_end := NOW() + INTERVAL '5 minutes';
    END IF;

    UPDATE cards SET
        current_bid = p_amount,
        top_bidder_id = p_user_id,
        bid_count = bid_count + 1,
        auction_end_date = v_new_end
    WHERE id = p_card_id;

    INSERT INTO bids (card_id, user_id, amount)
    VALUES (p_card_id, p_user_id, p_amount);
END;
$$ LANGUAGE plpgsql;


-- Atomic feedback submission with reputation calculation
CREATE OR REPLACE FUNCTION submit_feedback(
    p_interaction_id UUID,
    p_user_id UUID,
    p_feedback feedback_value
)
RETURNS VOID AS $$
DECLARE
    v_interaction RECORD;
    v_is_buyer BOOLEAN;
    v_buyer_award INTEGER := 0;
    v_seller_award INTEGER := 0;
    v_buyer_fb feedback_value;
    v_seller_fb feedback_value;
BEGIN
    SELECT * INTO v_interaction
    FROM trade_interactions WHERE id = p_interaction_id FOR UPDATE;

    IF v_interaction IS NULL THEN RAISE EXCEPTION 'Interaction not found'; END IF;

    v_is_buyer := v_interaction.buyer_id = p_user_id;

    IF v_is_buyer THEN
        UPDATE trade_interactions SET
            buyer_feedback = p_feedback, buyer_confirmed_at = NOW()
        WHERE id = p_interaction_id;
    ELSE
        UPDATE trade_interactions SET
            seller_feedback = p_feedback, seller_confirmed_at = NOW()
        WHERE id = p_interaction_id;
    END IF;

    SELECT * INTO v_interaction FROM trade_interactions WHERE id = p_interaction_id;
    v_buyer_fb := v_interaction.buyer_feedback;
    v_seller_fb := v_interaction.seller_feedback;

    IF v_buyer_fb IS NOT NULL AND v_seller_fb IS NOT NULL THEN
        IF v_buyer_fb != 'NO_CONCRETADO' AND v_seller_fb = 'NO_CONCRETADO' THEN
            v_buyer_award := 1; v_seller_award := 1;
        ELSIF v_buyer_fb != 'NO_CONCRETADO' AND v_seller_fb != 'NO_CONCRETADO' THEN
            v_seller_award := CASE v_buyer_fb
                WHEN 'MALO' THEN -2 WHEN 'BUENO' THEN 1 WHEN 'EXCELENTE' THEN 3 ELSE 0 END;
            v_buyer_award := CASE v_seller_fb
                WHEN 'MALO' THEN -2 WHEN 'BUENO' THEN 1 WHEN 'EXCELENTE' THEN 3 ELSE 0 END;
        END IF;

        IF v_buyer_award != 0 THEN
            UPDATE users SET searcher_score = searcher_score + v_buyer_award
            WHERE id = v_interaction.buyer_id;
        END IF;
        IF v_seller_award != 0 THEN
            UPDATE users SET trader_score = trader_score + v_seller_award
            WHERE id = v_interaction.seller_id;
        END IF;

        UPDATE trade_interactions SET status = 'COMPLETED' WHERE id = p_interaction_id;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Auto-create user profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, photo_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed Trader'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE binders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Binders are viewable by everyone" ON binders FOR SELECT USING (TRUE);
CREATE POLICY "Users can create own binders" ON binders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own binders" ON binders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own binders" ON binders FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Cards are viewable by everyone" ON cards FOR SELECT USING (TRUE);
CREATE POLICY "Users can create own cards" ON cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards" ON cards FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Bidders can update auction fields" ON cards FOR UPDATE
    USING (auction_status = 'ACTIVE' AND binder_type = 'AUCTION');

CREATE POLICY "Trade participants can view" ON trade_interactions FOR SELECT
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyer can create interaction" ON trade_interactions FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update interaction" ON trade_interactions FOR UPDATE
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users see own alerts" ON card_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own alerts" ON card_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON card_alerts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Reporters see own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Prices are public" ON prices FOR SELECT USING (TRUE);
CREATE POLICY "Stores are public" ON stores FOR SELECT USING (TRUE);
CREATE POLICY "News is public" ON news FOR SELECT USING (TRUE);
CREATE POLICY "Bids are viewable" ON bids FOR SELECT USING (TRUE);
CREATE POLICY "Users can place bids" ON bids FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Settings are readable" ON settings FOR SELECT USING (TRUE);


-- ─────────────────────────────────────────────────────────────
-- 8. REALTIME (enable in Supabase Dashboard)
-- ─────────────────────────────────────────────────────────────
-- ALTER PUBLICATION supabase_realtime ADD TABLE cards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE bids;


-- ─────────────────────────────────────────────────────────────
-- 9. VIEWS
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_tradeable_cards AS
SELECT
    c.id,
    c.name,
    c.set_name,
    c.collector_number,
    c.scryfall_id,
    c.condition,
    c.is_foil,
    c.quantity,
    c.image_url,
    c.rarity,
    c.user_id,
    c.binder_id,
    c.binder_type,
    c.custom_price,
    c.currency,
    c.is_showcase,
    c.purchase_url,
    c.added_at,
    p.price_sell_usd AS ck_price_usd,
    p.ck_name,
    p.ck_edition,
    COALESCE(b.price_multiplier,
        (SELECT (value->>'defaultMultiplier')::NUMERIC
         FROM settings WHERE key = 'system_config')
    , 3.0) AS multiplier,
    COALESCE(
        c.custom_price,
        ROUND(p.price_sell_usd * COALESCE(b.price_multiplier,
            (SELECT (value->>'defaultMultiplier')::NUMERIC
             FROM settings WHERE key = 'system_config')
        , 3.0), 2)
    ) AS display_price_pen,
    u.display_name AS seller_name,
    u.trader_score,
    u.searcher_score,
    u.whatsapp,
    u.subscription_tier,
    u.photo_url AS seller_photo,
    u.last_login AS seller_last_active
FROM cards c
LEFT JOIN prices p ON c.scryfall_id = p.scryfall_id
LEFT JOIN binders b ON c.binder_id = b.id
LEFT JOIN users u ON c.user_id = u.id
WHERE c.binder_type IN ('FOR_TRADE', 'AUCTION');


CREATE OR REPLACE VIEW v_active_auctions AS
SELECT
    c.*,
    p.price_sell_usd AS ck_price_usd,
    u.display_name AS seller_name,
    u.trader_score,
    u.photo_url AS seller_photo,
    b.price_multiplier AS binder_multiplier
FROM cards c
LEFT JOIN prices p ON c.scryfall_id = p.scryfall_id
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN binders b ON c.binder_id = b.id
WHERE c.auction_status = 'ACTIVE'
  AND c.binder_type = 'AUCTION';


CREATE OR REPLACE VIEW v_showcase_items AS
SELECT
    c.id,
    c.name,
    c.set_name,
    c.scryfall_id,
    c.condition,
    c.is_foil,
    c.image_url,
    c.rarity,
    c.user_id,
    c.binder_id,
    c.custom_price,
    c.added_at,
    p.price_sell_usd AS ck_price_usd,
    COALESCE(
        c.custom_price,
        ROUND(p.price_sell_usd * COALESCE(b.price_multiplier,
            (SELECT (value->>'defaultMultiplier')::NUMERIC
             FROM settings WHERE key = 'system_config')
        , 3.0), 2)
    ) AS display_price_pen,
    u.display_name AS seller_name,
    u.trader_score,
    u.subscription_tier
FROM cards c
LEFT JOIN prices p ON c.scryfall_id = p.scryfall_id
LEFT JOIN binders b ON c.binder_id = b.id
LEFT JOIN users u ON c.user_id = u.id
WHERE c.is_showcase = TRUE
ORDER BY c.added_at DESC;
