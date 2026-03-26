
-- Add vehicle_id to track which appointments have been converted to vehicles
ALTER TABLE public.appointments ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id);
