-- Detalle de un taller en el Panel de Propietario.
--
-- Deliberadamente NO expone el contenido del taller: ni sus vehiculos, ni sus
-- clientes, ni sus presupuestos, ni los nombres de su plantilla. Solo metricas
-- y el contacto de quien manda alli.
--
-- El motivo no es tecnico. Esos datos son de los clientes del taller, no del
-- dueno de la aplicacion: el los custodia, no los consulta. Y de cara a vender,
-- que un taller sepa que nadie puede fisgar su cartera es un argumento, no una
-- carencia. Si algun dia se abre esto, hay que revisar antes el contrato de
-- encargo del tratamiento.

-- ---------------------------------------------------------------------------
-- 1. Detalle: cuanto se usa, quien manda, nada mas.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.panel_propietario_detalle(_taller uuid)
RETURNS TABLE (
  nombre                 text,
  slug                   text,
  alta_en                timestamptz,
  estado_suscripcion     text,
  plan                   text,
  prueba_termina_en      timestamptz,
  suscripcion_termina_en timestamptz,
  dado_de_baja_en        timestamptz,
  contacto_nombre        text,
  contacto_correo        text,
  personas_por_rol       jsonb,
  personas_total         bigint,
  vehiculos_total        bigint,
  vehiculos_activos      bigint,
  citas_total            bigint,
  ultimo_acceso          timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_propietario_plataforma() THEN
    RAISE EXCEPTION 'Solo el propietario de la aplicacion puede ver este detalle.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT o.name, o.slug, o.created_at,
         o.estado_suscripcion::text, o.plan,
         o.prueba_termina_en, o.suscripcion_termina_en, o.dado_de_baja_en,
         pd.full_name::text,
         ud.email::text,
         -- Cuantos de cada rol. Ningun nombre.
         coalesce((SELECT jsonb_object_agg(x.role, x.n)
                     FROM (SELECT ur.role::text AS role, count(*) AS n
                             FROM public.user_roles ur
                            WHERE ur.organization_id = o.id
                            GROUP BY ur.role) x), '{}'::jsonb),
         (SELECT count(*) FROM public.profiles pr WHERE pr.organization_id = o.id),
         (SELECT count(*) FROM public.vehicles v WHERE v.organization_id = o.id),
         (SELECT count(*) FROM public.vehicles v
           WHERE v.organization_id = o.id AND v.status <> 'entregado'),
         (SELECT count(*) FROM public.appointments a WHERE a.organization_id = o.id),
         (SELECT max(u.last_sign_in_at)
            FROM public.profiles pr JOIN auth.users u ON u.id = pr.user_id
           WHERE pr.organization_id = o.id)
  FROM public.organizations o
  LEFT JOIN auth.users      ud ON ud.id = o.owner_id
  LEFT JOIN public.profiles pd ON pd.user_id = o.owner_id
  WHERE o.id = _taller;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Cambiar de plan.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.panel_propietario_cambiar_plan(_taller uuid, _plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_propietario_plataforma() THEN
    RAISE EXCEPTION 'Solo el propietario de la aplicacion puede cambiar el plan.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF _plan IS NOT NULL AND _plan NOT IN ('basico', 'profesional', 'pro') THEN
    RAISE EXCEPTION 'Plan no reconocido: %', _plan;
  END IF;

  UPDATE public.organizations
     SET plan = _plan, updated_at = now()
   WHERE id = _taller;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe ese taller.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Permisos.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.panel_propietario_detalle(uuid)            FROM public, anon;
REVOKE ALL ON FUNCTION public.panel_propietario_cambiar_plan(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.panel_propietario_detalle(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_propietario_cambiar_plan(uuid, text) TO authenticated;
