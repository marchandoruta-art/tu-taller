
-- 1. vehicle_files: Drop permissive "true" SELECT and overly broad INSERT/DELETE policies
DROP POLICY IF EXISTS "Users can view vehicle files" ON public.vehicle_files;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON public.vehicle_files;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON public.vehicle_files;

-- Add missing UPDATE policy for vehicle_files
CREATE POLICY "Org users can update vehicle files"
ON public.vehicle_files FOR UPDATE
USING (organization_id = get_user_organization_id());

-- 2. vehicle_anomalies: Drop permissive "true" SELECT and overly broad INSERT policies
DROP POLICY IF EXISTS "Users can view vehicle anomalies" ON public.vehicle_anomalies;
DROP POLICY IF EXISTS "Authenticated users can create anomalies" ON public.vehicle_anomalies;

-- 3. vehicle_photos: Drop overly broad INSERT and DELETE policies (org-scoped ones already exist)
DROP POLICY IF EXISTS "Authenticated users can insert vehicle photos" ON public.vehicle_photos;
DROP POLICY IF EXISTS "Users can delete their own photos or admin" ON public.vehicle_photos;

-- 4. profiles: Drop duplicate UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 5. notifications: Add DELETE policy for own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (organization_id = get_user_organization_id() AND auth.uid() = user_id);

-- 6. time_logs: Add DELETE policy for admins
CREATE POLICY "Admins can delete time_logs"
ON public.time_logs FOR DELETE
USING (organization_id = get_user_organization_id() AND is_org_admin());

-- 7. vehicle_messages: Add DELETE for own messages and UPDATE for own messages
CREATE POLICY "Users can update own messages"
ON public.vehicle_messages FOR UPDATE
USING (organization_id = get_user_organization_id() AND auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
ON public.vehicle_messages FOR DELETE
USING (organization_id = get_user_organization_id() AND auth.uid() = user_id);
