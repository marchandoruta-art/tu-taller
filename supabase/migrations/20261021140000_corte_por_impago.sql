-- El taller que no paga deja de entrar.
--
-- El panel del propietario ya permitia marcar a un taller como impagado o
-- darlo de baja, pero eso no tenia ningun efecto: seguia trabajando igual. El
-- estado se guardaba y no lo leia nadie.
--
-- El corte NO se hace escondiendo pantallas. Se hace en
-- get_user_organization_id(), que es de la que cuelgan todas las politicas de
-- seguridad de la aplicacion: si devuelve nulo, ninguna fila encaja con
-- ninguna politica y la aplicacion se apaga desde el servidor. Da igual que
-- alguien llame a la API por su cuenta.
--
-- Con margen: un pago que se retrasa no echa a nadie el mismo dia. Hay siete
-- dias de cortesia desde que vence, y durante ese tiempo se sigue entrando.

-- ---------------------------------------------------------------------------
-- 1. Si un taller tiene derecho a entrar.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.taller_tiene_acceso(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN o.id IS NULL              THEN false
    WHEN o.dado_de_baja_en IS NOT NULL THEN false
    WHEN o.estado_suscripcion = 'cancelada' THEN false
    WHEN o.estado_suscripcion = 'prueba' THEN
      coalesce(o.prueba_termina_en, now() + interval '1 day') > now()
    ELSE
      -- Activa o pago pendiente: se entra hasta siete dias despues de vencer.
      coalesce(o.suscripcion_termina_en, 'infinity'::timestamptz) > now() - interval '7 days'
  END
  FROM public.organizations o
  WHERE o.id = _org;
$$;

COMMENT ON FUNCTION public.taller_tiene_acceso(uuid) IS
  'Unica fuente de verdad sobre si un taller puede usar la aplicacion.';

-- ---------------------------------------------------------------------------
-- 2. El corte, donde de verdad corta.
--
--    Esta funcion la usan todas las politicas de seguridad. Al devolver nulo,
--    ninguna fila de ninguna tabla encaja y el taller queda fuera, entre por
--    donde entre.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
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
    -- Si el taller no esta al corriente, es como si la persona no tuviera
    -- taller: no hay nada que ver.
    AND public.taller_tiene_acceso(p.organization_id)
  LIMIT 1
$function$;

-- ---------------------------------------------------------------------------
-- 3. Pero tiene que poder saber POR QUE no entra.
--
--    Si se le corta el acceso a todo, tampoco puede leer su propio taller para
--    que la pantalla le explique que pasa. Esta funcion se salta el corte a
--    proposito y devuelve solo lo justo para dar la explicacion.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mi_suscripcion()
RETURNS TABLE (
  taller                 text,
  plan                   text,
  plan_nombre            text,
  estado                 text,
  prueba_termina_en      timestamptz,
  suscripcion_termina_en timestamptz,
  dado_de_baja_en        timestamptz,
  tiene_acceso           boolean,
  dias_de_cortesia       integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.name,
         o.plan,
         pl.nombre,
         o.estado_suscripcion::text,
         o.prueba_termina_en,
         o.suscripcion_termina_en,
         o.dado_de_baja_en,
         public.taller_tiene_acceso(o.id),
         GREATEST(0, EXTRACT(day FROM
           (coalesce(o.suscripcion_termina_en, now()) + interval '7 days') - now())::int)
  FROM public.profiles p
  JOIN public.organizations o ON o.id = p.organization_id
  LEFT JOIN public.planes pl  ON pl.codigo = o.plan
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 4. Permisos.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.taller_tiene_acceso(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.mi_suscripcion()          FROM public, anon;
GRANT EXECUTE ON FUNCTION public.taller_tiene_acceso(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mi_suscripcion()          TO authenticated;
