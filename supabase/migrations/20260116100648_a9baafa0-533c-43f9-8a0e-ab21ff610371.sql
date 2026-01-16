-- Create storage bucket for vehicle photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for vehicle-photos bucket
CREATE POLICY "Anyone can view vehicle photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Authenticated users can upload vehicle photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vehicle-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own uploaded photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = owner::text);

CREATE POLICY "Users can delete their own uploaded photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = owner::text);

-- Create table for vehicle photos with categories
CREATE TABLE IF NOT EXISTS public.vehicle_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'during', 'after')),
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vehicle_photos
ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicle_photos
CREATE POLICY "Anyone authenticated can view vehicle photos"
ON public.vehicle_photos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert vehicle photos"
ON public.vehicle_photos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own photos or admin"
ON public.vehicle_photos FOR DELETE
USING (
  auth.uid() = uploaded_by OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create table for scheduled deliveries/calendar
CREATE TABLE IF NOT EXISTS public.scheduled_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on scheduled_deliveries
ALTER TABLE public.scheduled_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduled_deliveries
CREATE POLICY "Anyone authenticated can view scheduled deliveries"
ON public.scheduled_deliveries FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can insert scheduled deliveries"
ON public.scheduled_deliveries FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can update scheduled deliveries"
ON public.scheduled_deliveries FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can delete scheduled deliveries"
ON public.scheduled_deliveries FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at on scheduled_deliveries
CREATE TRIGGER update_scheduled_deliveries_updated_at
BEFORE UPDATE ON public.scheduled_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_deliveries;