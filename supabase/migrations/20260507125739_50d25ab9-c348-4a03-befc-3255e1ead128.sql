
-- Remove the dangerous self-update policy
DROP POLICY IF EXISTS "Users can update their own role/org" ON public.user_roles;

-- Replace signup insert policy with one that only allows 'mecanico' role and no organization
DROP POLICY IF EXISTS "Allow insert during signup" ON public.user_roles;

CREATE POLICY "Allow mecanico insert during signup"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  AND role = 'mecanico'::user_role
  AND organization_id IS NULL
);
