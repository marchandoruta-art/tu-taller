-- Remove overly permissive policy that allows anyone to create organizations
DROP POLICY IF EXISTS "Anyone can create organization during signup" ON public.organizations;