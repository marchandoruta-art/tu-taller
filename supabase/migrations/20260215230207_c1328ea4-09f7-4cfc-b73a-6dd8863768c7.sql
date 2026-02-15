-- Fix lookup_organization_by_slug to require authentication and prevent org enumeration
CREATE OR REPLACE FUNCTION public.lookup_organization_by_slug(_slug text)
 RETURNS TABLE(id uuid, name text, slug text, logo_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT o.id, o.name, o.slug, o.logo_url
  FROM organizations o
  WHERE lower(o.slug) = lower(trim(_slug))
    AND auth.uid() IS NOT NULL
  LIMIT 1;
$function$;