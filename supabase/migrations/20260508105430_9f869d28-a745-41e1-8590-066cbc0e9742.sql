
CREATE OR REPLACE FUNCTION public.handle_vehicle_status_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when status actually changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- If new status is NOT 'recibido' and NOT 'en_reparacion'
    IF NEW.status NOT IN ('recibido', 'en_reparacion') THEN
      -- Stop any active timers on this vehicle
      UPDATE public.time_logs
      SET ended_at = now(),
          total_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - started_at)) / 60))::int
      WHERE vehicle_id = NEW.id
        AND ended_at IS NULL;

      -- Unassign technician
      NEW.assigned_to := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_vehicle_status_workflow() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_handle_vehicle_status_workflow ON public.vehicles;
CREATE TRIGGER trg_handle_vehicle_status_workflow
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.handle_vehicle_status_workflow();
