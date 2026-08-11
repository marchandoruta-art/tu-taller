-- 1. New vehicle date fields
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS itv_date date,
  ADD COLUMN IF NOT EXISTS next_maintenance_date date;

-- 2. Reminders table
CREATE TABLE IF NOT EXISTS public.client_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES public.owners(id) ON DELETE SET NULL,
  plate text NOT NULL,
  brand text,
  model text,
  owner_name text,
  owner_phone text,
  owner_email text,
  reminder_type text NOT NULL CHECK (reminder_type IN ('itv','mantenimiento')),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','enviado','descartado')),
  channel text,
  sent_at timestamptz,
  sent_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_reminders TO authenticated;
GRANT ALL ON public.client_reminders TO service_role;

ALTER TABLE public.client_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view reminders"
  ON public.client_reminders FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can create reminders"
  ON public.client_reminders FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can update reminders"
  ON public.client_reminders FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org admins can delete reminders"
  ON public.client_reminders FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE UNIQUE INDEX IF NOT EXISTS client_reminders_unique_key
  ON public.client_reminders (organization_id, plate, reminder_type, due_date);

CREATE INDEX IF NOT EXISTS client_reminders_org_status_idx
  ON public.client_reminders (organization_id, status, due_date);

CREATE TRIGGER trg_tenant_isolation
  BEFORE INSERT OR UPDATE ON public.client_reminders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_isolation();

CREATE TRIGGER update_client_reminders_updated_at
  BEFORE UPDATE ON public.client_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Generator function
CREATE OR REPLACE FUNCTION public.generate_client_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _today date := (now() AT TIME ZONE 'Europe/Madrid')::date;
  _org record;
  _lead integer;
  _created integer := 0;
  _n integer;
BEGIN
  FOR _org IN SELECT id FROM public.organizations LOOP
    SELECT COALESCE(NULLIF(value, '')::int, 30) INTO _lead
    FROM public.app_settings
    WHERE organization_id = _org.id AND key = 'reminder_lead_days'
    LIMIT 1;
    IF _lead IS NULL THEN _lead := 30; END IF;

    WITH latest AS (
      SELECT DISTINCT ON (v.plate) v.*
      FROM public.vehicles v
      WHERE v.organization_id = _org.id
      ORDER BY v.plate, COALESCE(v.delivered_at, v.finished_at, v.created_at) DESC
    ),
    candidates AS (
      SELECT l.id, l.owner_id, l.plate, l.brand, l.model, 'itv'::text AS reminder_type, l.itv_date AS due_date
      FROM latest l
      WHERE l.itv_date IS NOT NULL
        AND l.itv_date <= _today + _lead
        AND l.itv_date >= _today - 60
      UNION ALL
      SELECT l.id, l.owner_id, l.plate, l.brand, l.model, 'mantenimiento'::text,
             COALESCE(
               l.next_maintenance_date,
               (COALESCE(l.delivered_at, l.finished_at)::date + interval '1 year')::date
             ) AS due_date
      FROM latest l
      WHERE COALESCE(l.next_maintenance_date, COALESCE(l.delivered_at, l.finished_at)::date) IS NOT NULL
    ),
    filtered AS (
      SELECT * FROM candidates
      WHERE due_date IS NOT NULL
        AND due_date <= _today + _lead
        AND due_date >= _today - 60
    ),
    ins AS (
      INSERT INTO public.client_reminders (
        organization_id, vehicle_id, owner_id, plate, brand, model,
        owner_name, owner_phone, owner_email, reminder_type, due_date
      )
      SELECT _org.id, f.id, f.owner_id, f.plate, f.brand, f.model,
             o.name, o.phone, o.email, f.reminder_type, f.due_date
      FROM filtered f
      LEFT JOIN public.owners o ON o.id = f.owner_id
      ON CONFLICT (organization_id, plate, reminder_type, due_date) DO NOTHING
      RETURNING 1
    )
    SELECT count(*) INTO _n FROM ins;
    _created := _created + COALESCE(_n, 0);
  END LOOP;

  RETURN _created;
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_client_reminders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_client_reminders() TO authenticated, service_role;

-- 4. Daily cron at 09:15 Madrid (07:15 UTC summer / 08:15 UTC winter -> run both, function is idempotent)
SELECT cron.unschedule('generate-client-reminders-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-client-reminders-daily'
);
SELECT cron.schedule(
  'generate-client-reminders-daily',
  '15 7,8 * * *',
  $$SELECT public.generate_client_reminders();$$
);
