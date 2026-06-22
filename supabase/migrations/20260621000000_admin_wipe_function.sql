-- Admin-only RPC: wipes all binders (cascades to cards) and resets reputation scores.
-- Uses SECURITY DEFINER so it bypasses RLS, but checks is_admin internally.
CREATE OR REPLACE FUNCTION admin_wipe_binders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  DELETE FROM binders;

  UPDATE users SET trader_score = 0, searcher_score = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_wipe_binders() TO authenticated;
