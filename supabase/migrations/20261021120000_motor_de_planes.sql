-- Motor de planes: que puede hacer cada taller segun lo que paga.
--
-- Hasta ahora `plan` y `estado_suscripcion` se guardaban en la tabla de
-- talleres pero no los leia nadie: un taller marcado como impagado seguia
-- trabajando igual, y el plan gratuito tenia exactamente lo mismo que el de
-- pago. Los tres planes eran un documento, no codigo.
--
-- Los limites viven en una tabla, no escritos en el programa. Cambiar lo que
-- incluye un plan, subir un limite o anadir un plan nuevo es una consulta, no
-- un despliegue. Eso importa porque los precios y los limites van a moverse
-- varias veces antes de acertar.

-- ---------------------------------------------------------------------------
-- 1. Los planes y lo que incluye cada uno.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planes (
  codigo                text PRIMARY KEY,
  nombre                text    NOT NULL,
  precio_mensual        numeric(6,2),
  orden                 smallint NOT NULL,

  -- Limites. NULL significa sin limite.
  max_usuarios          integer,
  max_vehiculos_activos integer,
  meses_historial       integer,
  usos_ia_mes           integer,

  -- Funciones que se encienden o se apagan.
  registro_jornada      boolean NOT NULL DEFAULT false,
  documentos_con_logo   boolean NOT NULL DEFAULT false,
  portal_cliente        boolean NOT NULL DEFAULT false,
  avisos_itv            boolean NOT NULL DEFAULT false,
  citas_web             boolean NOT NULL DEFAULT false,
  productividad         boolean NOT NULL DEFAULT false,
  estadisticas          boolean NOT NULL DEFAULT false,

  creado_en             timestamptz NOT NULL DEFAULT now(),
  actualizado_en        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.planes IS
  'Que incluye cada plan. Se cambia con un UPDATE: ni se toca el codigo ni se despliega.';
COMMENT ON COLUMN public.planes.max_usuarios IS
  'NULL es sin limite. Mismo criterio en el resto de columnas de limite.';

ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;

-- Cualquiera que haya entrado puede leer los planes: la aplicacion necesita
-- saber que le falta para ofrecer la mejora. Escribir, solo el dueno.
DROP POLICY IF EXISTS "Los planes se pueden consultar" ON public.planes;
CREATE POLICY "Los planes se pueden consultar"
  ON public.planes FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.planes FROM anon;
GRANT SELECT ON public.planes TO authenticated;

INSERT INTO public.planes (codigo, nombre, precio_mensual, orden,
  max_usuarios, max_vehiculos_activos, meses_historial, usos_ia_mes,
  registro_jornada, documentos_con_logo, portal_cliente, avisos_itv,
  citas_web, productividad, estadisticas)
VALUES
  ('gratis',      'Gratis',      0.00,  1,    1,    5,    3,    0, false, false, false, false, false, false, false),
  ('profesional', 'Profesional', 29.99, 2,    5, NULL, NULL,   25, true,  true,  true,  true,  false, false, false),
  ('completo',    'Completo',    39.99, 3, NULL, NULL, NULL, NULL, true,  true,  true,  true,  true,  true,  true)
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Cada taller tiene un plan.
-- ---------------------------------------------------------------------------
UPDATE public.organizations SET plan = 'completo'
WHERE plan IS NULL OR plan NOT IN (SELECT codigo FROM public.planes);

ALTER TABLE public.organizations
  ALTER COLUMN plan SET DEFAULT 'gratis';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_plan_valido') THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_plan_valido
      FOREIGN KEY (plan) REFERENCES public.planes(codigo);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Consultar el plan de un taller.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plan_del_taller(_org uuid DEFAULT public.get_user_organization_id())
RETURNS public.planes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.* FROM public.organizations o
  JOIN public.planes p ON p.codigo = o.plan
  WHERE o.id = _org;
$$;

-- Si el taller tiene derecho a una funcion concreta.
CREATE OR REPLACE FUNCTION public.taller_puede(_funcion text, _org uuid DEFAULT public.get_user_organization_id())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan public.planes;
BEGIN
  IF _org IS NULL THEN RETURN false; END IF;
  SELECT * INTO _plan FROM public.plan_del_taller(_org);
  IF _plan.codigo IS NULL THEN RETURN false; END IF;

  RETURN CASE _funcion
    WHEN 'registro_jornada'    THEN _plan.registro_jornada
    WHEN 'documentos_con_logo' THEN _plan.documentos_con_logo
    WHEN 'portal_cliente'      THEN _plan.portal_cliente
    WHEN 'avisos_itv'          THEN _plan.avisos_itv
    WHEN 'citas_web'           THEN _plan.citas_web
    WHEN 'productividad'       THEN _plan.productividad
    WHEN 'estadisticas'        THEN _plan.estadisticas
    ELSE false
  END;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Los limites se hacen cumplir en la base, no en la pantalla.
--
--    Esconder un boton no es un limite: cualquiera puede llamar a la API por
--    su cuenta. Si el limite importa, tiene que estar aqui.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.comprobar_limite_usuarios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max integer;
  _n   integer;
BEGIN
  IF NEW.organization_id IS NULL THEN RETURN NEW; END IF;

  SELECT max_usuarios INTO _max FROM public.plan_del_taller(NEW.organization_id);
  IF _max IS NULL THEN RETURN NEW; END IF;

  SELECT count(DISTINCT user_id) INTO _n
  FROM public.user_roles
  WHERE organization_id = NEW.organization_id
    AND user_id <> NEW.user_id;

  IF _n >= _max THEN
    RAISE EXCEPTION 'El plan actual admite % usuario(s). Para anadir mas, hay que cambiar de plan.', _max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_limite_usuarios ON public.user_roles;
CREATE TRIGGER trg_limite_usuarios
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.comprobar_limite_usuarios();

CREATE OR REPLACE FUNCTION public.comprobar_limite_vehiculos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max integer;
  _n   integer;
BEGIN
  IF NEW.organization_id IS NULL THEN RETURN NEW; END IF;

  SELECT max_vehiculos_activos INTO _max FROM public.plan_del_taller(NEW.organization_id);
  IF _max IS NULL THEN RETURN NEW; END IF;

  -- Cuentan los que estan dentro del taller. Los entregados no ocupan sitio.
  SELECT count(*) INTO _n
  FROM public.vehicles
  WHERE organization_id = NEW.organization_id
    AND status <> 'entregado'
    AND id <> NEW.id;

  IF _n >= _max THEN
    RAISE EXCEPTION 'El plan actual admite % vehiculos a la vez en el taller. Entrega alguno o cambia de plan.', _max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_limite_vehiculos ON public.vehicles;
CREATE TRIGGER trg_limite_vehiculos
  BEFORE INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.comprobar_limite_vehiculos();

-- ---------------------------------------------------------------------------
-- 5. Las citas por internet dependen del plan, no de un interruptor suelto.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cita_publica_config(_slug text)
RETURNS TABLE (
  nombre        text,
  logo_url      text,
  servicios     text[],
  avisos        text[],
  duracion_min  integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.name, o.logo_url, o.citas_servicios, o.citas_avisos, o.citas_duracion_min
  FROM public.organizations o
  JOIN public.planes p ON p.codigo = o.plan
  WHERE o.slug = btrim(_slug)
    AND o.citas_web_activas
    AND p.citas_web
    AND o.dado_de_baja_en IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.plan_del_taller(uuid)        FROM public, anon;
REVOKE ALL ON FUNCTION public.taller_puede(text, uuid)     FROM public, anon;
GRANT EXECUTE ON FUNCTION public.plan_del_taller(uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.taller_puede(text, uuid)  TO authenticated;
REVOKE ALL ON FUNCTION public.cita_publica_config(text) FROM public;
GRANT EXECUTE ON FUNCTION public.cita_publica_config(text) TO anon, authenticated;
