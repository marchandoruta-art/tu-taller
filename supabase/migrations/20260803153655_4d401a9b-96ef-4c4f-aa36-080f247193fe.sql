-- 1. CRITICAL: cross-tenant vehicle deletion by any admin
DROP POLICY IF EXISTS "Admins can delete vehicles" ON public.vehicles;

-- 2. CRITICAL: cross-tenant role escalation
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;

-- 3. Force every existing policy to require an authenticated session
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated',
                   r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 4. Remove any anonymous access to tenant data (public flows use service role)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tablename);
  END LOOP;
END $$;

-- 5. Defense in depth: stamp + verify organization_id on every insert/update
CREATE OR REPLACE FUNCTION public.enforce_tenant_isolation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid;
BEGIN
  -- service_role / internal jobs (no auth.uid()) are trusted, skip
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  _org := public.get_user_organization_id(auth.uid());
  IF _org IS NULL THEN
    RAISE EXCEPTION 'El usuario no pertenece a ningún taller';
  END IF;

  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := _org;
  ELSIF NEW.organization_id <> _org THEN
    RAISE EXCEPTION 'Acceso denegado: el registro no pertenece a tu taller';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_tenant_isolation() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attname = 'organization_id'
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND c.relname NOT IN ('profiles', 'user_roles', 'organizations')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_tenant_isolation ON public.%I', r.relname);
    EXECUTE format(
      'CREATE TRIGGER trg_tenant_isolation BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_isolation()',
      r.relname);
  END LOOP;
END $$;