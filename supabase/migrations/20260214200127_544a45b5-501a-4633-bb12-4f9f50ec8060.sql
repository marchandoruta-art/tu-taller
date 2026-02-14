
-- Create vehicle status history table
CREATE TABLE public.vehicle_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  old_status public.vehicle_status,
  new_status public.vehicle_status NOT NULL,
  changed_by UUID,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can view status history"
  ON public.vehicle_status_history FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org users can insert status history"
  ON public.vehicle_status_history FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Trigger to auto-log status changes
CREATE OR REPLACE FUNCTION public.log_vehicle_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.vehicle_status_history (vehicle_id, old_status, new_status, changed_by, organization_id)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_vehicle_status_change
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_vehicle_status_change();

-- Index for performance
CREATE INDEX idx_vehicle_status_history_vehicle_id ON public.vehicle_status_history(vehicle_id);
