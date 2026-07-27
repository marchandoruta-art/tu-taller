-- Ensure postgres (cron runner) can always execute the helper
GRANT EXECUTE ON FUNCTION public.auto_stop_vehicle_timers() TO postgres;

-- Remove previous single-shot schedules
DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobid FROM cron.job WHERE jobname IN (
    'auto-stop-vehicle-timers-summer',
    'auto-stop-vehicle-timers-winter',
    'auto-stop-vehicle-timers-summer-safety',
    'auto-stop-vehicle-timers-winter-safety'
  ) LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END $$;

-- Summer (CEST = UTC+2): 17:15 Madrid = 15:15 UTC. Run every 5 min 15:15-21:55 UTC, Mon-Fri.
SELECT cron.schedule(
  'auto-stop-vehicle-timers-summer',
  '15,20,25,30,35,40,45,50,55 15 * * 1-5',
  $$SELECT public.auto_stop_vehicle_timers();$$
);
SELECT cron.schedule(
  'auto-stop-vehicle-timers-summer-evening',
  '*/5 16-21 * * 1-5',
  $$SELECT public.auto_stop_vehicle_timers();$$
);

-- Winter (CET = UTC+1): 17:15 Madrid = 16:15 UTC. Run every 5 min 16:15-22:55 UTC, Mon-Fri.
SELECT cron.schedule(
  'auto-stop-vehicle-timers-winter',
  '15,20,25,30,35,40,45,50,55 16 * * 1-5',
  $$SELECT public.auto_stop_vehicle_timers();$$
);
SELECT cron.schedule(
  'auto-stop-vehicle-timers-winter-evening',
  '*/5 17-22 * * 1-5',
  $$SELECT public.auto_stop_vehicle_timers();$$
);

-- Update function to only act after 17:15 Madrid local time (safety in case cron fires early)
CREATE OR REPLACE FUNCTION public.auto_stop_vehicle_timers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _count integer := 0;
  _madrid timestamp := (now() AT TIME ZONE 'Europe/Madrid');
  _today date := _madrid::date;
  _cutoff time := time '17:15';
BEGIN
  -- Only act after 17:15 Madrid time on weekdays
  IF EXTRACT(DOW FROM _madrid) NOT IN (1,2,3,4,5) THEN
    RETURN 0;
  END IF;
  IF _madrid::time < _cutoff THEN
    RETURN 0;
  END IF;

  WITH updated AS (
    UPDATE public.time_logs t
    SET ended_at = now(),
        total_minutes = GREATEST(1, CEIL(EXTRACT(EPOCH FROM (now() - t.started_at)) / 60))::int
    WHERE t.ended_at IS NULL
      AND (
        t.organization_id IS NULL
        OR t.organization_id NOT IN (
          SELECT organization_id
          FROM public.organization_holidays
          WHERE date = _today
        )
      )
    RETURNING 1
  )
  SELECT count(*) INTO _count FROM updated;
  RETURN _count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.auto_stop_vehicle_timers() TO postgres;