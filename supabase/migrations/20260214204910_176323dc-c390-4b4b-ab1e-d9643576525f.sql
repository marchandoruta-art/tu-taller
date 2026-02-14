-- Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('vehicle-files', 'vehicle-photos');

-- Drop existing permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can view vehicle files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view vehicle photos" ON storage.objects;

-- Create new SELECT policies requiring authentication
CREATE POLICY "Authenticated users can view vehicle files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vehicle-files'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can view vehicle photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vehicle-photos'
  AND auth.uid() IS NOT NULL
);
