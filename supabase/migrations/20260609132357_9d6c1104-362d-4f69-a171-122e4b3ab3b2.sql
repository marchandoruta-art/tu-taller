CREATE TABLE public.organization_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date date NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_holidays TO authenticated;
GRANT ALL ON public.organization_holidays TO service_role;

ALTER TABLE public.organization_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage holidays for their org"
ON public.organization_holidays
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.organization_id = organization_holidays.organization_id
    AND ur.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.organization_id = organization_holidays.organization_id
    AND ur.role = 'admin'
));

CREATE TRIGGER update_organization_holidays_updated_at
BEFORE UPDATE ON public.organization_holidays
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.auto_stop_vehicle_timers()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  _count integer;
  _today date := (now() AT TIME ZONE 'Europe/Madrid')::date;
BEGIN
  WITH updated AS (
    UPDATE public.time_logs t
    SET ended_at = now(),
        total_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - t.started_at)) / 60))::int
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