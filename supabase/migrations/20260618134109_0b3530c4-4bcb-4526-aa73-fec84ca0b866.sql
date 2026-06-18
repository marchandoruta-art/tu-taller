
CREATE OR REPLACE FUNCTION public.enforce_single_active_timer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ended_at IS NULL THEN
    UPDATE public.time_logs
    SET ended_at = now(),
        total_minutes = GREATEST(1, CEIL(EXTRACT(EPOCH FROM (now() - started_at)) / 60))::int
    WHERE user_id = NEW.user_id
      AND ended_at IS NULL
      AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_stop_vehicle_timers()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _count integer;
  _today date := (now() AT TIME ZONE 'Europe/Madrid')::date;
BEGIN
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

CREATE OR REPLACE FUNCTION public.handle_vehicle_status_workflow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status NOT IN ('recibido', 'en_reparacion') THEN
      UPDATE public.time_logs
      SET ended_at = now(),
          total_minutes = GREATEST(1, CEIL(EXTRACT(EPOCH FROM (now() - started_at)) / 60))::int
      WHERE vehicle_id = NEW.id
        AND ended_at IS NULL;

      NEW.assigned_to := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
