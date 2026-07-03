
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
      -- assigned_to is preserved intentionally on any status change
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
