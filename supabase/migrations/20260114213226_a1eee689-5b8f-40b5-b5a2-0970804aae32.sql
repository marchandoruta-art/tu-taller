-- Add reference field to parts table
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS reference TEXT;

-- Create anomalies table
CREATE TABLE public.vehicle_anomalies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on anomalies
ALTER TABLE public.vehicle_anomalies ENABLE ROW LEVEL SECURITY;

-- RLS policies for anomalies
CREATE POLICY "Users can view vehicle anomalies" 
ON public.vehicle_anomalies 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create anomalies" 
ON public.vehicle_anomalies 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete anomalies" 
ON public.vehicle_anomalies 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create vehicle_files table
CREATE TABLE public.vehicle_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vehicle_files
ALTER TABLE public.vehicle_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicle_files
CREATE POLICY "Users can view vehicle files" 
ON public.vehicle_files 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can upload files" 
ON public.vehicle_files 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete files" 
ON public.vehicle_files 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create storage bucket for vehicle files
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-files', 'vehicle-files', true);

-- RLS policies for storage bucket
CREATE POLICY "Anyone can view vehicle files"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-files');

CREATE POLICY "Authenticated users can upload vehicle files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vehicle-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete vehicle files"
ON storage.objects FOR DELETE
USING (bucket_id = 'vehicle-files' AND auth.uid() IS NOT NULL);