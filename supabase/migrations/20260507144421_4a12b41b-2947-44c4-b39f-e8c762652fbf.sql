
-- 1. Storage: scope vehicle-files and vehicle-photos by organization
DROP POLICY IF EXISTS "Authenticated users can view vehicle files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vehicle files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vehicle files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Org users can view vehicle files storage" ON storage.objects;
DROP POLICY IF EXISTS "Org users can upload vehicle files storage" ON storage.objects;
DROP POLICY IF EXISTS "Org users can update vehicle files storage" ON storage.objects;
DROP POLICY IF EXISTS "Org users can delete vehicle files storage" ON storage.objects;
DROP POLICY IF EXISTS "Org users can view vehicle photos storage" ON storage.objects;
DROP POLICY IF EXISTS "Org users can upload vehicle photos storage" ON storage.objects;
DROP POLICY IF EXISTS "Org users can update vehicle photos storage" ON storage.objects;
DROP POLICY IF EXISTS "Org users can delete vehicle photos storage" ON storage.objects;

-- vehicle-files: path format is "<vehicle_id>/<filename>"
CREATE POLICY "Org users can view vehicle files storage"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vehicle-files'
  AND EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Org users can upload vehicle files storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-files'
  AND EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Org users can update vehicle files storage"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'vehicle-files'
  AND EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Org users can delete vehicle files storage"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'vehicle-files'
  AND EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.organization_id = public.get_user_organization_id()
  )
);

-- vehicle-photos: same path pattern
CREATE POLICY "Org users can view vehicle photos storage"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Org users can upload vehicle photos storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-photos'
  AND EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Org users can update vehicle photos storage"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Org users can delete vehicle photos storage"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.organization_id = public.get_user_organization_id()
  )
);

-- 2. vehicle_status_history: allow admin DELETE
CREATE POLICY "Org admins can delete status history"
ON public.vehicle_status_history FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization_id() AND public.is_org_admin());

-- 3. user_roles: restrict mecanico signup insert to authenticated only
DROP POLICY IF EXISTS "Allow mecanico insert during signup" ON public.user_roles;
CREATE POLICY "Allow mecanico insert during signup"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'mecanico'::user_role
  AND organization_id IS NULL
);

-- 4. Realtime authorization: scope channel subscriptions by organization
-- Topic convention: "<table>:org:<organization_id>"
DROP POLICY IF EXISTS "Org users can subscribe to org realtime" ON realtime.messages;
CREATE POLICY "Org users can subscribe to org realtime"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE '%:org:' || public.get_user_organization_id()::text
);

DROP POLICY IF EXISTS "Org users can broadcast to org realtime" ON realtime.messages;
CREATE POLICY "Org users can broadcast to org realtime"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() LIKE '%:org:' || public.get_user_organization_id()::text
);
