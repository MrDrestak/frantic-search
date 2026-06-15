-- Supabase removed auto-GRANT to API roles for new objects after 2026-05-30.
-- All callable functions need explicit GRANT EXECUTE to be reachable via /rest/v1/rpc/.

-- Cron job — called by service_role via GitHub Actions expire-trials workflow
GRANT EXECUTE ON FUNCTION public.expire_trials() TO service_role;

-- Called by authenticated users via /rpc/
GRANT EXECUTE ON FUNCTION public.place_bid(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_feedback(UUID, UUID, feedback_value) TO authenticated;

-- Read-only helpers callable by any role
GRANT EXECUTE ON FUNCTION public.get_card_price_pen(TEXT, UUID, NUMERIC) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_binder_multiplier(UUID) TO anon, authenticated, service_role;
