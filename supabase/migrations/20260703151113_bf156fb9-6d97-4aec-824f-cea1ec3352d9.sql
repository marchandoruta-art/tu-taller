
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove previous schedules if they exist
DO $$ BEGIN PERFORM cron.unschedule('remind-pending-vehicles-am-winter'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('remind-pending-vehicles-am-summer'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('remind-pending-vehicles-pm-winter'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('remind-pending-vehicles-pm-summer'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Helper: call edge function using vault secrets
CREATE OR REPLACE FUNCTION public.trigger_pending_reminder(_slot text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _url text;
  _key text;
BEGIN
  SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  IF _url IS NULL OR _key IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _url || '/functions/v1/remind-pending-vehicles?slot=' || _slot,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := '{}'::jsonb
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trigger_pending_reminder(text) FROM PUBLIC, anon, authenticated;

-- 08:15 Madrid: 07:15 UTC (winter) / 06:15 UTC (summer), Mon-Fri
SELECT cron.schedule(
  'remind-pending-vehicles-am-winter',
  '15 7 * * 1-5',
  $$ SELECT public.trigger_pending_reminder('am'); $$
);
SELECT cron.schedule(
  'remind-pending-vehicles-am-summer',
  '15 6 * * 1-5',
  $$ SELECT public.trigger_pending_reminder('am'); $$
);

-- 14:00 Madrid: 13:00 UTC (winter) / 12:00 UTC (summer), Mon-Fri
SELECT cron.schedule(
  'remind-pending-vehicles-pm-winter',
  '0 13 * * 1-5',
  $$ SELECT public.trigger_pending_reminder('pm'); $$
);
SELECT cron.schedule(
  'remind-pending-vehicles-pm-summer',
  '0 12 * * 1-5',
  $$ SELECT public.trigger_pending_reminder('pm'); $$
);
