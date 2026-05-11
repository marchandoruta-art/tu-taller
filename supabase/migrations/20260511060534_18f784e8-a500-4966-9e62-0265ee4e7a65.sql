
-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to auto-close all open vehicle timers
CREATE OR REPLACE FUNCTION public.auto_stop_vehicle_timers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
BEGIN
  WITH updated AS (
    UPDATE public.time_logs
    SET ended_at = now(),
        total_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - started_at)) / 60))::int
    WHERE ended_at IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO _count FROM updated;
  RETURN _count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_stop_vehicle_timers() FROM PUBLIC, anon;

-- Remove previous schedules if they exist
DO $$
BEGIN
  PERFORM cron.unschedule('auto-stop-vehicle-timers-summer');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('auto-stop-vehicle-timers-winter');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule for Spain 17:00 in summer (CEST, UTC+2) -> 15:00 UTC, Mon-Fri
SELECT cron.schedule(
  'auto-stop-vehicle-timers-summer',
  '0 15 * * 1-5',
  $$ SELECT public.auto_stop_vehicle_timers(); $$
);

-- Schedule for Spain 17:00 in winter (CET, UTC+1) -> 16:00 UTC, Mon-Fri
-- Idempotent: if already stopped by summer job, no rows are affected
SELECT cron.schedule(
  'auto-stop-vehicle-timers-winter',
  '0 16 * * 1-5',
  $$ SELECT public.auto_stop_vehicle_timers(); $$
);
