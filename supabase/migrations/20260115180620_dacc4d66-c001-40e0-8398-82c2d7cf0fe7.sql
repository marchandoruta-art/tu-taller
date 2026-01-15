-- Add fields for archiving delivered vehicles
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Allow admins to delete vehicles
CREATE POLICY "Admins can delete vehicles"
ON public.vehicles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create app_settings table for app configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage app settings
CREATE POLICY "Admins can view app settings"
ON public.app_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can insert app settings"
ON public.app_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update app settings"
ON public.app_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete app settings"
ON public.app_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Insert default app name
INSERT INTO public.app_settings (key, value)
VALUES ('app_name', 'Gestión Autos Formentera')
ON CONFLICT (key) DO NOTHING;

-- Create function to auto-archive delivered vehicles after 24h
CREATE OR REPLACE FUNCTION public.archive_old_delivered_vehicles()
RETURNS void AS $$
BEGIN
  UPDATE public.vehicles
  SET archived = true
  WHERE status = 'entregado'
    AND delivered_at IS NOT NULL
    AND delivered_at < now() - interval '24 hours'
    AND archived = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to set delivered_at when status changes to 'entregado'
CREATE OR REPLACE FUNCTION public.set_delivered_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'entregado' AND (OLD.status IS NULL OR OLD.status != 'entregado') THEN
    NEW.delivered_at = now();
  ELSIF NEW.status != 'entregado' THEN
    NEW.delivered_at = NULL;
    NEW.archived = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_delivered_at_trigger ON public.vehicles;
CREATE TRIGGER set_delivered_at_trigger
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.set_delivered_at();