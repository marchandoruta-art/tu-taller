-- Panel del propietario de la aplicacion.
--
-- Hasta ahora cada taller esta aislado del resto y nadie ve por encima de
-- ellos. Quien vende la aplicacion necesita lo contrario: la lista de todos los
-- talleres, en que estado esta cada uno y si paga.
--
-- Portado del prototipo BOXCONTROL con un cambio importante: alli el
-- propietario estaba escrito a pelo dentro de la funcion
-- (`IF email != 'marchandoruta@gmail.com'`), de modo que cambiar de correo
-- dejaba al dueno fuera de su propio panel. Aqui es una fila en una tabla.

-- ---------------------------------------------------------------------------
-- 1. Quien es el dueno de la aplicacion.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.propietarios_plataforma (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  creado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.propietarios_plataforma ENABLE ROW LEVEL SECURITY;

-- Sin politicas a proposito: nadie lee esta tabla desde la aplicacion. Solo la
-- consultan las funciones de abajo, que se ejecutan con permisos elevados.
REVOKE ALL ON public.propietarios_plataforma FROM anon, authenticated;

COMMENT ON TABLE public.propietarios_plataforma IS
  'Cuentas que gobiernan la aplicacion por encima de los talleres. Normalmente una.';

-- ---------------------------------------------------------------------------
-- 2. Estado comercial de cada taller.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_suscripcion') THEN
    CREATE TYPE public.estado_suscripcion AS ENUM
      ('prueba', 'activa', 'pago_pendiente', 'cancelada');
  END IF;
END $$;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS estado_suscripcion public.estado_suscripcion NOT NULL DEFAULT 'activa',
  ADD COLUMN IF NOT EXISTS plan               text,
  ADD COLUMN IF NOT EXISTS prueba_termina_en  timestamptz,
  ADD COLUMN IF NOT EXISTS suscripcion_termina_en timestamptz,
  ADD COLUMN IF NOT EXISTS dado_de_baja_en    timestamptz;

COMMENT ON COLUMN public.organizations.estado_suscripcion IS
  'Los talleres que ya existian se dan por activos: nadie les va a cortar el acceso de golpe.';

-- ---------------------------------------------------------------------------
-- 3. Comprobacion de propietario.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_propietario_plataforma(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.propietarios_plataforma WHERE user_id = _user_id);
$$;

-- ---------------------------------------------------------------------------
-- 4. Los datos del panel.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.panel_propietario_talleres()
RETURNS TABLE (
  id                     uuid,
  nombre                 text,
  slug                   text,
  plan                   text,
  estado_suscripcion     text,
  prueba_termina_en      timestamptz,
  suscripcion_termina_en timestamptz,
  dado_de_baja_en        timestamptz,
  alta_en                timestamptz,
  correo_propietario     text,
  nombre_propietario     text,
  personas               bigint,
  vehiculos              bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_propietario_plataforma() THEN
    RAISE EXCEPTION 'Solo el propietario de la aplicacion puede ver este panel.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT o.id,
         o.name,
         o.slug,
         o.plan,
         o.estado_suscripcion::text,
         o.prueba_termina_en,
         o.suscripcion_termina_en,
         o.dado_de_baja_en,
         o.created_at,
         u.email::text,
         p.full_name::text,
         (SELECT count(*) FROM public.profiles   pr WHERE pr.organization_id = o.id),
         (SELECT count(*) FROM public.vehicles    v WHERE v.organization_id  = o.id)
  FROM public.organizations o
  LEFT JOIN auth.users      u ON u.id = o.owner_id
  LEFT JOIN public.profiles p ON p.user_id = o.owner_id
  ORDER BY o.created_at DESC;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Cambiar el estado de un taller.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.panel_propietario_cambiar_estado(
  _taller uuid,
  _estado public.estado_suscripcion,
  _hasta  timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_propietario_plataforma() THEN
    RAISE EXCEPTION 'Solo el propietario de la aplicacion puede cambiar el estado de un taller.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.organizations
     SET estado_suscripcion = _estado,
         suscripcion_termina_en = CASE WHEN _estado = 'activa' THEN _hasta ELSE suscripcion_termina_en END,
         prueba_termina_en      = CASE WHEN _estado = 'prueba' THEN _hasta ELSE prueba_termina_en END,
         dado_de_baja_en        = CASE WHEN _estado = 'cancelada' THEN now() ELSE NULL END,
         updated_at = now()
   WHERE id = _taller;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe ese taller.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Permisos.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.panel_propietario_talleres()          FROM public, anon;
REVOKE ALL ON FUNCTION public.panel_propietario_cambiar_estado(uuid, public.estado_suscripcion, timestamptz) FROM public, anon;
REVOKE ALL ON FUNCTION public.es_propietario_plataforma(uuid)       FROM public, anon;

GRANT EXECUTE ON FUNCTION public.panel_propietario_talleres()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_propietario_cambiar_estado(uuid, public.estado_suscripcion, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_propietario_plataforma(uuid)       TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. El dueno. Una fila, cambiable sin migracion.
-- ---------------------------------------------------------------------------
INSERT INTO public.propietarios_plataforma (user_id)
SELECT id FROM auth.users WHERE lower(email) = 'admin@admin'
ON CONFLICT (user_id) DO NOTHING;
