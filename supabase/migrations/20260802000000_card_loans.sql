-- Sprint 7: Card Loans System
-- Adds card_loans table, available-quantity function (SECURITY DEFINER),
-- updates v_tradeable_cards and v_showcase_items to filter loaned-out copies,
-- and updates handle_new_user for auto-linkeo of borrowers at registration.

-- ─────────────────────────────────────────────────────────────
-- 1. TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.card_loans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id         UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    lender_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    borrower_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
    borrower_email  TEXT NOT NULL,
    borrower_name   TEXT,
    quantity        INTEGER NOT NULL DEFAULT 1,
    loan_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loans_card     ON public.card_loans(card_id);
CREATE INDEX IF NOT EXISTS idx_loans_lender   ON public.card_loans(lender_id);
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON public.card_loans(borrower_email);

ALTER TABLE public.card_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lenders can view own loans"
    ON public.card_loans FOR SELECT USING (auth.uid() = lender_id);
CREATE POLICY "Lenders can create loans"
    ON public.card_loans FOR INSERT WITH CHECK (auth.uid() = lender_id);
CREATE POLICY "Lenders can delete own loans"
    ON public.card_loans FOR DELETE USING (auth.uid() = lender_id);
CREATE POLICY "Lenders can update own loans"
    ON public.card_loans FOR UPDATE USING (auth.uid() = lender_id);


-- ─────────────────────────────────────────────────────────────
-- 2. FUNCTION: get_available_quantity
-- SECURITY DEFINER is required so that the views and public callers
-- can read card_loans without being blocked by the lender-only RLS policy.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_available_quantity(p_card_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_total  INTEGER;
    v_loaned INTEGER;
BEGIN
    SELECT quantity INTO v_total FROM public.cards WHERE id = p_card_id;
    SELECT COALESCE(SUM(quantity), 0) INTO v_loaned
        FROM public.card_loans WHERE card_id = p_card_id;
    RETURN GREATEST(v_total - v_loaned, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_available_quantity(UUID) TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────
-- 3. UPDATE v_tradeable_cards: add available_quantity, hide fully-loaned cards
-- ─────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.v_tradeable_cards CASCADE;
CREATE VIEW public.v_tradeable_cards AS
SELECT
    c.id,
    c.name,
    c.set_name,
    c.collector_number,
    c.scryfall_id,
    c.condition,
    c.is_foil,
    c.quantity,
    public.get_available_quantity(c.id) AS available_quantity,
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
         FROM public.settings WHERE key = 'system_config')
    , 3.0) AS multiplier,
    COALESCE(
        c.custom_price,
        ROUND(p.price_sell_usd * COALESCE(b.price_multiplier,
            (SELECT (value->>'defaultMultiplier')::NUMERIC
             FROM public.settings WHERE key = 'system_config')
        , 3.0), 2)
    ) AS display_price_pen,
    u.display_name AS seller_name,
    u.trader_score,
    u.searcher_score,
    u.whatsapp,
    u.subscription_tier,
    u.photo_url AS seller_photo,
    u.last_login AS seller_last_active
FROM public.cards c
LEFT JOIN public.prices p ON c.scryfall_id = p.scryfall_id
LEFT JOIN public.binders b ON c.binder_id = b.id
LEFT JOIN public.users u ON c.user_id = u.id
WHERE c.binder_type IN ('FOR_TRADE', 'AUCTION')
  AND public.get_available_quantity(c.id) > 0;


-- ─────────────────────────────────────────────────────────────
-- 4. UPDATE v_showcase_items: add whatsapp/seller_photo, hide fully-loaned cards
-- ─────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.v_showcase_items CASCADE;
CREATE VIEW public.v_showcase_items AS
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
    c.quantity,
    p.price_sell_usd AS ck_price_usd,
    COALESCE(
        c.custom_price,
        ROUND(p.price_sell_usd * COALESCE(b.price_multiplier,
            (SELECT (value->>'defaultMultiplier')::NUMERIC
             FROM public.settings WHERE key = 'system_config')
        , 3.0), 2)
    ) AS display_price_pen,
    u.display_name AS seller_name,
    u.trader_score,
    u.subscription_tier,
    u.whatsapp AS seller_whatsapp,
    u.photo_url AS seller_photo,
    public.get_available_quantity(c.id) AS available_quantity
FROM public.cards c
LEFT JOIN public.prices p ON c.scryfall_id = p.scryfall_id
LEFT JOIN public.binders b ON c.binder_id = b.id
LEFT JOIN public.users u ON c.user_id = u.id
WHERE c.is_showcase = TRUE
  AND public.get_available_quantity(c.id) > 0
ORDER BY c.added_at DESC;


-- ─────────────────────────────────────────────────────────────
-- 5. AUTO-LINKEO: Update handle_new_user to link loans by borrower_email
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, photo_url, subscription_tier, trial_ends_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed Trader'),
        NEW.raw_user_meta_data->>'avatar_url',
        'UNCOMMON',
        NOW() + INTERVAL '30 days'
    );

    -- Link any existing loans where this email was the borrower
    UPDATE public.card_loans
    SET borrower_id   = NEW.id,
        borrower_name = COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unnamed Trader')
    WHERE borrower_email = NEW.email
      AND borrower_id IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
