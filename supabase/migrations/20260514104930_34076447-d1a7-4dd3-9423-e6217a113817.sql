
CREATE OR REPLACE FUNCTION public.enforce_single_active_timer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ended_at IS NULL THEN
    UPDATE public.time_logs
    SET ended_at = now(),
        total_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - started_at)) / 60))::int
    WHERE user_id = NEW.user_id
      AND ended_at IS NULL
      AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_active_timer ON public.time_logs;
CREATE TRIGGER trg_enforce_single_active_timer
AFTER INSERT ON public.time_logs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_active_timer();

REVOKE EXECUTE ON FUNCTION public.enforce_single_active_timer() FROM PUBLIC, anon;
