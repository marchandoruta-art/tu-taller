
-- 1) Functions that run the work directly inside Postgres (no external auth needed)

CREATE OR REPLACE FUNCTION public.cron_auto_clock_in()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Europe/Madrid')::date;
  _clock_in timestamptz := ((_today::text || ' 08:00:00')::timestamp AT TIME ZONE 'Europe/Madrid');
  _count integer := 0;
  _p record;
BEGIN
  FOR _p IN
    SELECT user_id, organization_id
    FROM public.profiles
    WHERE organization_id IS NOT NULL
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.attendance_logs
      WHERE user_id = _p.user_id
        AND clock_in >= (_today::text || ' 00:00:00')::timestamp AT TIME ZONE 'Europe/Madrid'
        AND clock_in <  ((_today + 1)::text || ' 00:00:00')::timestamp AT TIME ZONE 'Europe/Madrid'
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.attendance_logs (user_id, organization_id, clock_in, exit_type)
    VALUES (_p.user_id, _p.organization_id, _clock_in, NULL);
    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cron_auto_clock_out()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now timestamptz := now();
  _count integer := 0;
BEGIN
  WITH updated AS (
    UPDATE public.attendance_logs
    SET clock_out = _now,
        total_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_now - clock_in)) / 60))::int,
        exit_type = 'auto_16h'
    WHERE clock_out IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO _count FROM updated;
  RETURN _count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_auto_clock_in() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_auto_clock_out() FROM PUBLIC, anon, authenticated;

-- 2) Reschedule crons in UTC matching Europe/Madrid 08:00 entry, 16:00 exit
--    Use two entries so it works in both CET (winter, UTC+1) and CEST (summer, UTC+2).
--    The internal function skips duplicates within the same day.

SELECT cron.unschedule(jobid) FROM cron.job
 WHERE jobname IN (
   'auto-clock-in-8am',
   'auto-clock-out-4pm',
   'auto-clock-in-8am-winter',
   'auto-clock-in-8am-summer',
   'auto-clock-out-4pm-winter',
   'auto-clock-out-4pm-summer',
   'check-attendance-8h'
 );

-- Clock-in at 08:00 Madrid: 07:00 UTC (winter) and 06:00 UTC (summer)
SELECT cron.schedule(
  'auto-clock-in-8am-winter',
  '0 7 * * 1-5',
  $$ SELECT public.cron_auto_clock_in(); $$
);
SELECT cron.schedule(
  'auto-clock-in-8am-summer',
  '0 6 * * 1-5',
  $$ SELECT public.cron_auto_clock_in(); $$
);

-- Clock-out at 16:00 Madrid: 15:00 UTC (winter) and 14:00 UTC (summer)
SELECT cron.schedule(
  'auto-clock-out-4pm-winter',
  '0 15 * * 1-5',
  $$ SELECT public.cron_auto_clock_out(); $$
);
SELECT cron.schedule(
  'auto-clock-out-4pm-summer',
  '0 14 * * 1-5',
  $$ SELECT public.cron_auto_clock_out(); $$
);
