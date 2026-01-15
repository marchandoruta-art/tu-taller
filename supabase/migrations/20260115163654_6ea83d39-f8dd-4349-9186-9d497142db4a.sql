-- Add vehicle reception/inspection fields for active reception checklist
ALTER TABLE public.vehicles 
ADD COLUMN fuel_level integer DEFAULT 0 CHECK (fuel_level >= 0 AND fuel_level <= 8),
ADD COLUMN mileage integer,
ADD COLUMN reception_notes text,
ADD COLUMN exterior_damages jsonb DEFAULT '[]'::jsonb,
ADD COLUMN interior_check jsonb DEFAULT '{}'::jsonb,
ADD COLUMN client_belongings text,
ADD COLUMN client_signature text,
ADD COLUMN reception_date timestamp with time zone DEFAULT now(),
ADD COLUMN deposit_receipt_generated boolean DEFAULT false;

-- Add comments to describe the columns
COMMENT ON COLUMN public.vehicles.fuel_level IS 'Fuel level from 0 (empty) to 8 (full)';
COMMENT ON COLUMN public.vehicles.mileage IS 'Vehicle mileage at reception in km';
COMMENT ON COLUMN public.vehicles.reception_notes IS 'General notes from the reception inspection';
COMMENT ON COLUMN public.vehicles.exterior_damages IS 'JSON array of exterior damages found during reception';
COMMENT ON COLUMN public.vehicles.interior_check IS 'JSON object with interior checklist items';
COMMENT ON COLUMN public.vehicles.client_belongings IS 'Description of client belongings left in vehicle';
COMMENT ON COLUMN public.vehicles.client_signature IS 'Base64 encoded client signature';
COMMENT ON COLUMN public.vehicles.reception_date IS 'Date and time of vehicle reception';
COMMENT ON COLUMN public.vehicles.deposit_receipt_generated IS 'Whether deposit receipt has been generated';