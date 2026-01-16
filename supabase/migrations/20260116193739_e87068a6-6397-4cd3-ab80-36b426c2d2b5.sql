-- Drop and recreate lookup function with correct signature
DROP FUNCTION IF EXISTS public.lookup_organization_by_slug(text);

CREATE OR REPLACE FUNCTION public.lookup_organization_by_slug(_slug text)
RETURNS TABLE(id uuid, name text, slug text, logo_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT o.id, o.name, o.slug, o.logo_url
  FROM organizations o
  WHERE lower(o.slug) = lower(trim(_slug))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_organization_by_slug(text) TO authenticated;