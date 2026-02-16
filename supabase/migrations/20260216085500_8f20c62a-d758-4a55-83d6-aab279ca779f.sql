
-- Restrict owners SELECT to admin and oficina roles only
DROP POLICY IF EXISTS "Org users can view owners" ON public.owners;

CREATE POLICY "Only admin and oficina can view owners"
ON public.owners
FOR SELECT
USING (
  organization_id = get_user_organization_id()
  AND (
    is_org_admin()
    OR has_role(auth.uid(), 'oficina')
  )
);
