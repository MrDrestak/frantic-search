-- Sprint 5.3 — Trial Uncommon automático de 30 días al registro
-- Reemplaza handle_new_user() para activar el trial y agrega expire_trials()

CREATE OR REPLACE FUNCTION handle_new_user()
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
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Llamado diariamente por el cron de GitHub Actions
CREATE OR REPLACE FUNCTION expire_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE users
    SET subscription_tier = 'COMMON',
        trial_ends_at     = NULL
    WHERE subscription_tier = 'UNCOMMON'
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at < NOW();
END;
$$;
