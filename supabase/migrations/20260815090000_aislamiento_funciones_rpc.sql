-- Aislamiento multi-taller: cierre de las funciones SECURITY DEFINER.
--
-- Estas funciones se ejecutan saltandose RLS, asi que ninguna politica las cubre.
-- Todas aceptaban un uuid arbitrario y respondian sobre usuarios de cualquier taller.
--
-- Invariante del que dependen los guardas: `auth.uid() IS NULL` solo puede darse en
-- contexto interno de confianza (service_role o pg_cron), porque el rol `anon` no
-- tiene EXECUTE sobre ninguna de estas funciones. Es el mismo criterio que ya usa
-- enforce_tenant_isolation(). Si algun dia se le concede EXECUTE a `anon`, estos
-- guardas dejan de sostenerse.

-- 1. CRITICO. assign_user_to_organization validaba el taller de quien llama, pero
--    nunca el del usuario destino: un admin podia llevarse a un empleado de otro
--    taller pasando su uuid. La alta legitima (UserManagement.tsx) asigna a un
--    usuario recien registrado, que todavia no tiene taller.
CREATE OR REPLACE FUNCTION public.assign_user_to_organization(_target_user_id uuid, _org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_actual uuid;
BEGIN
  IF NOT (is_org_admin() AND get_user_organization_id() = _org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT organization_id INTO _org_actual
  FROM public.profiles
  WHERE user_id = _target_user_id;

  IF _org_actual IS NOT NULL AND _org_actual <> _org_id THEN
    RAISE EXCEPTION 'Not authorized: el usuario ya pertenece a otro taller';
  END IF;

  UPDATE public.profiles
  SET organization_id = _org_id
  WHERE user_id = _target_user_id;

  UPDATE public.user_roles
  SET organization_id = _org_id
  WHERE user_id = _target_user_id;
END;
$function$;

-- 2. get_user_organization_id respondia para cualquier uuid, revelando a que taller
--    pertenece cada usuario. Todas las llamadas reales usan auth.uid().
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.organization_id
  FROM public.profiles p
  WHERE p.user_id = _user_id
    AND (
      auth.uid() IS NULL
      OR _user_id = auth.uid()
      OR p.organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
    )
  LIMIT 1
$function$;

-- 3. get_user_role permitia sondear los roles de la plantilla de otro taller.
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
    AND (
      auth.uid() IS NULL
      OR _user_id = auth.uid()
      OR ur.organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
    )
  LIMIT 1
$function$;

-- 4. has_role. Las politicas la llaman siempre con auth.uid(), pero acepta cualquiera.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND (
        auth.uid() IS NULL
        OR _user_id = auth.uid()
        OR ur.organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
      )
  )
$function$;

-- 5. user_belongs_to_org era un oraculo de pertenencia para cualquier par usuario-taller.
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.organization_id = _org_id
      AND (
        auth.uid() IS NULL
        OR _user_id = auth.uid()
        OR _org_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
      )
  )
$function$;

-- 6. is_org_owner revelaba quien es el propietario de cualquier taller.
CREATE OR REPLACE FUNCTION public.is_org_owner(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = _org_id
      AND o.owner_id = _user_id
      AND (
        auth.uid() IS NULL
        OR _org_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
      )
  )
$function$;
