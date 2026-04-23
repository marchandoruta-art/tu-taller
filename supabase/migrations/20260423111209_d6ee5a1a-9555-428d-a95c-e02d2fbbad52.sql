ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'presupuestar' AFTER 'recibido';
ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'presupuestado' AFTER 'presupuestar';