ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION public.set_finished_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status = 'terminado' AND (OLD.status IS NULL OR OLD.status != 'terminado') THEN
    NEW.finished_at = now();
  ELSIF NEW.status != 'terminado' AND OLD.status = 'terminado' THEN
    NEW.finished_at = NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS set_finished_at_trigger ON public.vehicles;
CREATE TRIGGER set_finished_at_trigger
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.set_finished_at();