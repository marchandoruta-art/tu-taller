-- Fix profiles SELECT policy: remove public exposure when organization_id IS NULL
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
CREATE POLICY "Users can view profiles in their org"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR user_id = auth.uid()
  );

-- Fix user_roles SELECT policy: remove public exposure when organization_id IS NULL
DROP POLICY IF EXISTS "Users can view roles in their org" ON public.user_roles;
CREATE POLICY "Users can view roles in their org"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR user_id = auth.uid()
  );