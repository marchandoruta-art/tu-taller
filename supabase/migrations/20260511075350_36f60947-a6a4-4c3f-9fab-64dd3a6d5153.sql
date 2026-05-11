-- Permanent vehicle history snapshot: preserves EVERYTHING when a vehicle is deleted
CREATE TABLE IF NOT EXISTS public.vehicle_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  plate text NOT NULL,
  brand text,
  model text,
  owner_id uuid,
  owner_snapshot jsonb,
  vehicle_snapshot jsonb NOT NULL,
  parts_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  time_logs_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  status_history_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  messages_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  files_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  anomalies_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid
);

CREATE INDEX IF NOT EXISTS idx_vehicle_archives_org ON public.vehicle_archives(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_archives_plate ON public.vehicle_archives(organization_id, plate);
CREATE INDEX IF NOT EXISTS idx_vehicle_archives_owner ON public.vehicle_archives(owner_id);

ALTER TABLE public.vehicle_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can view vehicle archives"
ON public.vehicle_archives FOR SELECT
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org admins can delete vehicle archives"
ON public.vehicle_archives FOR DELETE
TO authenticated
USING (organization_id = public.get_user_organization_id() AND public.is_org_admin());

-- Trigger function: snapshot everything BEFORE the vehicle row disappears
CREATE OR REPLACE FUNCTION public.snapshot_vehicle_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _owner jsonb;
  _parts jsonb;
  _time_logs jsonb;
  _status jsonb;
  _photos jsonb;
  _messages jsonb;
  _files jsonb;
  _anomalies jsonb;
BEGIN
  SELECT to_jsonb(o.*) INTO _owner FROM public.owners o WHERE o.id = OLD.owner_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(p.*) ORDER BY p.created_at), '[]'::jsonb)
    INTO _parts FROM public.parts p WHERE p.vehicle_id = OLD.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(t.*) ORDER BY t.started_at), '[]'::jsonb)
    INTO _time_logs FROM public.time_logs t WHERE t.vehicle_id = OLD.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(s.*) ORDER BY s.created_at), '[]'::jsonb)
    INTO _status FROM public.vehicle_status_history s WHERE s.vehicle_id = OLD.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(ph.*) ORDER BY ph.created_at), '[]'::jsonb)
    INTO _photos FROM public.vehicle_photos ph WHERE ph.vehicle_id = OLD.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(m.*) ORDER BY m.created_at), '[]'::jsonb)
    INTO _messages FROM public.vehicle_messages m WHERE m.vehicle_id = OLD.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(f.*) ORDER BY f.created_at), '[]'::jsonb)
    INTO _files FROM public.vehicle_files f WHERE f.vehicle_id = OLD.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(a.*) ORDER BY a.created_at), '[]'::jsonb)
    INTO _anomalies FROM public.vehicle_anomalies a WHERE a.vehicle_id = OLD.id;

  INSERT INTO public.vehicle_archives (
    vehicle_id, organization_id, plate, brand, model, owner_id,
    owner_snapshot, vehicle_snapshot,
    parts_snapshot, time_logs_snapshot, status_history_snapshot,
    photos_snapshot, messages_snapshot, files_snapshot, anomalies_snapshot,
    archived_by
  ) VALUES (
    OLD.id, OLD.organization_id, OLD.plate, OLD.brand, OLD.model, OLD.owner_id,
    _owner, to_jsonb(OLD.*),
    _parts, _time_logs, _status,
    _photos, _messages, _files, _anomalies,
    auth.uid()
  );

  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.snapshot_vehicle_before_delete() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_snapshot_vehicle_before_delete ON public.vehicles;
CREATE TRIGGER trg_snapshot_vehicle_before_delete
BEFORE DELETE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_vehicle_before_delete();