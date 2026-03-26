
-- Create appointment type enum
CREATE TYPE public.appointment_type AS ENUM ('mecanica', 'chapa_pintura');

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME WITHOUT TIME ZONE,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  vehicle_plate TEXT,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  issue_description TEXT,
  appointment_type appointment_type NOT NULL DEFAULT 'mecanica',
  assigned_to UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org users can view appointments"
  ON public.appointments FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org users can insert appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Org users can update appointments"
  ON public.appointments FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Org users can delete appointments"
  ON public.appointments FOR DELETE
  USING (organization_id = get_user_organization_id());

-- Updated_at trigger
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
