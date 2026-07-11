
-- Confirmation status enum for appointments
DO $$ BEGIN
  CREATE TYPE public.appointment_confirmation_status AS ENUM ('pendiente','confirmada','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Approval status enum
DO $$ BEGIN
  CREATE TYPE public.client_approval_status AS ENUM ('pendiente','aprobado','rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) Appointments: confirmation fields
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmation_status public.appointment_confirmation_status NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS confirmation_token uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- 2) client_approvals table
CREATE TABLE IF NOT EXISTS public.client_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  description text NOT NULL,
  estimated_info text,
  status public.client_approval_status NOT NULL DEFAULT 'pendiente',
  requested_by uuid,
  client_response_at timestamptz,
  client_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_approvals TO authenticated;
GRANT ALL ON public.client_approvals TO service_role;
ALTER TABLE public.client_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view approvals" ON public.client_approvals
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "admin/oficina can insert approvals" ON public.client_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'oficina'))
  );
CREATE POLICY "admin/oficina can update approvals" ON public.client_approvals
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'oficina'))
  );
CREATE POLICY "admin can delete approvals" ON public.client_approvals
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.has_role(auth.uid(),'admin')
  );

CREATE TRIGGER update_client_approvals_updated_at
  BEFORE UPDATE ON public.client_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_client_approvals_vehicle ON public.client_approvals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_client_approvals_org ON public.client_approvals(organization_id);

-- 3) audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can view audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "org members insert audit log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE INDEX IF NOT EXISTS idx_audit_log_org_created ON public.audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);

-- 4) Trigger to log vehicle deletes and assignment changes
CREATE OR REPLACE FUNCTION public.audit_vehicle_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (organization_id, user_id, action, entity_type, entity_id, details)
    VALUES (OLD.organization_id, auth.uid(), 'vehicle_deleted', 'vehicle', OLD.id,
      jsonb_build_object('plate', OLD.plate, 'brand', OLD.brand, 'model', OLD.model, 'status', OLD.status));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.audit_log (organization_id, user_id, action, entity_type, entity_id, details)
      VALUES (NEW.organization_id, auth.uid(), 'vehicle_reassigned', 'vehicle', NEW.id,
        jsonb_build_object('plate', NEW.plate, 'old_assigned_to', OLD.assigned_to, 'new_assigned_to', NEW.assigned_to));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_vehicle_delete ON public.vehicles;
CREATE TRIGGER trg_audit_vehicle_delete
  BEFORE DELETE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.audit_vehicle_changes();

DROP TRIGGER IF EXISTS trg_audit_vehicle_reassign ON public.vehicles;
CREATE TRIGGER trg_audit_vehicle_reassign
  AFTER UPDATE OF assigned_to ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.audit_vehicle_changes();
