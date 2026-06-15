-- Sprint 5 — Cierre automático de subastas expiradas
-- close_auction(UUID)           → cierra una carta específica (llamado desde el cliente)
-- close_expired_auctions()      → cierra todas las expiradas (llamado por cron)

CREATE OR REPLACE FUNCTION public.close_auction(p_card_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec           RECORD;
  buyer_name    TEXT;
BEGIN
  SELECT c.id, c.user_id, c.name, c.image_url,
         c.top_bidder_id, c.current_bid, c.currency, c.binder_id
  INTO rec
  FROM public.cards c
  WHERE c.id = p_card_id
    AND c.binder_type = 'AUCTION'
    AND c.auction_status = 'ACTIVE'
    AND c.auction_end_date < NOW();

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF rec.top_bidder_id IS NOT NULL THEN
    UPDATE public.cards
    SET auction_status = 'ENDED',
        winner_id      = rec.top_bidder_id
    WHERE id = p_card_id
      AND auction_status = 'ACTIVE';

    SELECT display_name INTO buyer_name
    FROM public.users WHERE id = rec.top_bidder_id;

    INSERT INTO public.notifications (user_id, type, title, message, link_url, image_url)
    VALUES
      (rec.user_id,
       'SYSTEM',
       '¡Subasta finalizada!',
       'Tu ' || rec.name || ' fue vendida por ' ||
         CASE rec.currency WHEN 'PEN' THEN 'S/ ' ELSE '$ ' END ||
         ROUND(rec.current_bid, 2)::TEXT || '. ¡Contacta al ganador!',
       '/auctions',
       rec.image_url),
      (rec.top_bidder_id,
       'SYSTEM',
       '¡Ganaste la subasta!',
       '¡Felicidades! Ganaste ' || rec.name || ' por ' ||
         CASE rec.currency WHEN 'PEN' THEN 'S/ ' ELSE '$ ' END ||
         ROUND(rec.current_bid, 2)::TEXT || '. Contacta al vendedor.',
       '/auctions',
       rec.image_url);

    INSERT INTO public.trade_interactions
      (seller_id, buyer_id, buyer_name, card_name, card_id, binder_id, status)
    VALUES
      (rec.user_id, rec.top_bidder_id,
       COALESCE(buyer_name, 'Ganador'),
       rec.name, p_card_id, rec.binder_id,
       'PENDING');
  ELSE
    UPDATE public.cards
    SET auction_status = 'ENDED'
    WHERE id = p_card_id
      AND auction_status = 'ACTIVE';
  END IF;

  RETURN TRUE;
END;
$$;


CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec           RECORD;
  buyer_name    TEXT;
  closed_count  INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT c.id, c.user_id, c.name, c.image_url,
           c.top_bidder_id, c.current_bid, c.currency, c.binder_id
    FROM public.cards c
    WHERE c.binder_type = 'AUCTION'
      AND c.auction_status = 'ACTIVE'
      AND c.auction_end_date < NOW()
  LOOP
    IF rec.top_bidder_id IS NOT NULL THEN
      UPDATE public.cards
      SET auction_status = 'ENDED',
          winner_id      = rec.top_bidder_id
      WHERE id = rec.id
        AND auction_status = 'ACTIVE';

      SELECT display_name INTO buyer_name
      FROM public.users WHERE id = rec.top_bidder_id;

      INSERT INTO public.notifications (user_id, type, title, message, link_url, image_url)
      VALUES
        (rec.user_id,
         'SYSTEM',
         '¡Subasta finalizada!',
         'Tu ' || rec.name || ' fue vendida por ' ||
           CASE rec.currency WHEN 'PEN' THEN 'S/ ' ELSE '$ ' END ||
           ROUND(rec.current_bid, 2)::TEXT || '. ¡Contacta al ganador!',
         '/auctions',
         rec.image_url),
        (rec.top_bidder_id,
         'SYSTEM',
         '¡Ganaste la subasta!',
         '¡Felicidades! Ganaste ' || rec.name || ' por ' ||
           CASE rec.currency WHEN 'PEN' THEN 'S/ ' ELSE '$ ' END ||
           ROUND(rec.current_bid, 2)::TEXT || '. Contacta al vendedor.',
         '/auctions',
         rec.image_url);

      INSERT INTO public.trade_interactions
        (seller_id, buyer_id, buyer_name, card_name, card_id, binder_id, status)
      VALUES
        (rec.user_id, rec.top_bidder_id,
         COALESCE(buyer_name, 'Ganador'),
         rec.name, rec.id, rec.binder_id,
         'PENDING');
    ELSE
      UPDATE public.cards
      SET auction_status = 'ENDED'
      WHERE id = rec.id
        AND auction_status = 'ACTIVE';
    END IF;

    closed_count := closed_count + 1;
  END LOOP;

  RETURN closed_count;
END;
$$;


GRANT EXECUTE ON FUNCTION public.close_auction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_expired_auctions() TO service_role;
