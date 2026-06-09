
-- 1) Priority enum and column on vehicles
DO $$ BEGIN
  CREATE TYPE public.vehicle_priority AS ENUM ('baja','normal','alta','urgente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS priority public.vehicle_priority NOT NULL DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_vehicles_priority ON public.vehicles(organization_id, priority);

-- 2) task_templates
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_templates TO authenticated;
GRANT ALL ON public.task_templates TO service_role;

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org templates"
  ON public.task_templates FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admin/oficina can insert templates"
  ON public.task_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficina'))
  );

CREATE POLICY "Admin/oficina can update templates"
  ON public.task_templates FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficina'))
  );

CREATE POLICY "Admin/oficina can delete templates"
  ON public.task_templates FOR DELETE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficina'))
  );

CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) client_portal_tokens
CREATE TABLE IF NOT EXISTS public.client_portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  revoked boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_tokens_vehicle ON public.client_portal_tokens(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON public.client_portal_tokens(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portal_tokens TO authenticated;
GRANT ALL ON public.client_portal_tokens TO service_role;

ALTER TABLE public.client_portal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/oficina can view org portal tokens"
  ON public.client_portal_tokens FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficina'))
  );

CREATE POLICY "Admin/oficina can create portal tokens"
  ON public.client_portal_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficina'))
  );

CREATE POLICY "Admin/oficina can update portal tokens"
  ON public.client_portal_tokens FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficina'))
  );

CREATE POLICY "Admin/oficina can delete portal tokens"
  ON public.client_portal_tokens FOR DELETE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'oficina'))
  );
