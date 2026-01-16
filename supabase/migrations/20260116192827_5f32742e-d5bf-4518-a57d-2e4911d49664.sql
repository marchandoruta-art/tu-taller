-- Allow organization owners to read their organization (fixes INSERT return=representation)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
      AND tablename='organizations' 
      AND policyname='Organization owners can view their org'
  ) THEN
    CREATE POLICY "Organization owners can view their org"
    ON public.organizations
    FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid());
  END IF;
END $$;

-- Secure lookup by invite code without opening SELECT to all orgs
CREATE OR REPLACE FUNCTION public.lookup_organization_by_slug(_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select o.id, o.name, o.slug, o.logo_url
  from public.organizations o
  where o.slug = lower(trim(_slug))
  limit 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_organization_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_organization_by_slug(text) TO authenticated;