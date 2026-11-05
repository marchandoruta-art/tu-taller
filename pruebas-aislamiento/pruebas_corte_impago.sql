\set ON_ERROR_STOP off
SET client_min_messages TO NOTICE;
BEGIN;
CREATE OR REPLACE FUNCTION pg_temp.c(_n text,_ok boolean,_d text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  RAISE NOTICE '%  %  %', CASE WHEN _ok THEN 'OK    ' ELSE 'FALLA ' END, rpad(_n,56), _d; END $$;

DO $$
DECLARE
  _org uuid := '33333333-0000-0000-0000-000000000001';
  _jef uuid := '33333333-0000-0000-0000-000000000002';
BEGIN
  INSERT INTO auth.users (id,email) VALUES (_jef,'corte@p.local');
  INSERT INTO public.organizations (id,name,slug,owner_id,plan,estado_suscripcion)
  VALUES (_org,'Taller Corte','taller-corte',_jef,'completo','activa');
  INSERT INTO public.profiles (user_id,organization_id,full_name) VALUES (_jef,_org,'Jefe')
  ON CONFLICT (user_id) DO UPDATE SET organization_id=_org;
  DELETE FROM public.user_roles WHERE user_id=_jef;
  INSERT INTO public.user_roles (user_id,organization_id,role) VALUES (_jef,_org,'admin');
  INSERT INTO public.vehicles (organization_id,plate,brand,model,status)
  VALUES (_org,'CORTE1','M','M','recibido');
END $$;

DO $$
DECLARE
  _org uuid := '33333333-0000-0000-0000-000000000001';
  _jef uuid := '33333333-0000-0000-0000-000000000002';
  _n integer;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub',_jef)::text, true);

  -- Al corriente
  PERFORM pg_temp.c('al corriente: tiene acceso', public.taller_tiene_acceso(_org));
  PERFORM pg_temp.c('al corriente: ve su taller',
    public.get_user_organization_id() = _org);
  SELECT count(*) INTO _n FROM public.vehicles WHERE organization_id=_org;
  PERFORM pg_temp.c('al corriente: ve su vehiculo', _n = 1, 've=' || _n);

  -- Impago reciente: dentro de la cortesia
  UPDATE public.organizations
     SET estado_suscripcion='pago_pendiente',
         suscripcion_termina_en = now() - interval '3 days'
   WHERE id=_org;
  PERFORM pg_temp.c('impago de 3 dias: sigue entrando (cortesia)',
    public.taller_tiene_acceso(_org));

  -- Impago pasada la cortesia
  UPDATE public.organizations SET suscripcion_termina_en = now() - interval '9 days'
   WHERE id=_org;
  PERFORM pg_temp.c('impago de 9 dias: se le corta', NOT public.taller_tiene_acceso(_org));
  PERFORM pg_temp.c('y deja de tener taller a efectos de permisos',
    public.get_user_organization_id() IS NULL);
  SELECT count(*) INTO _n FROM public.vehicles WHERE organization_id=_org;
  PERFORM pg_temp.c('ya no ve sus vehiculos ni llamando directo', _n = 0, 've=' || _n);

  -- Pero sigue pudiendo saber por que
  PERFORM pg_temp.c('aun asi puede ver su estado y el motivo',
    EXISTS (SELECT 1 FROM public.mi_suscripcion() WHERE NOT tiene_acceso));
  PERFORM pg_temp.c('y la pantalla sabe que plan tenia',
    (SELECT plan_nombre FROM public.mi_suscripcion()) = 'Completo');

  -- Al pagar, vuelve
  UPDATE public.organizations
     SET estado_suscripcion='activa', suscripcion_termina_en = now() + interval '30 days'
   WHERE id=_org;
  PERFORM pg_temp.c('al pagar, recupera el acceso', public.taller_tiene_acceso(_org));
  SELECT count(*) INTO _n FROM public.vehicles WHERE organization_id=_org;
  PERFORM pg_temp.c('y vuelve a ver sus vehiculos', _n = 1, 've=' || _n);

  -- Prueba caducada
  UPDATE public.organizations
     SET estado_suscripcion='prueba', prueba_termina_en = now() - interval '1 day',
         suscripcion_termina_en = NULL
   WHERE id=_org;
  PERFORM pg_temp.c('prueba caducada: se le corta', NOT public.taller_tiene_acceso(_org));
  UPDATE public.organizations SET prueba_termina_en = now() + interval '5 days' WHERE id=_org;
  PERFORM pg_temp.c('prueba en marcha: entra', public.taller_tiene_acceso(_org));

  -- De baja
  UPDATE public.organizations SET estado_suscripcion='cancelada' WHERE id=_org;
  PERFORM pg_temp.c('dado de baja: no entra', NOT public.taller_tiene_acceso(_org));
END $$;

-- Lo critico: el taller de siempre, sin fechas, no se queda fuera.
DO $$
DECLARE _n integer;
BEGIN
  SELECT count(*) INTO _n FROM public.organizations o
   WHERE o.estado_suscripcion = 'activa'
     AND o.suscripcion_termina_en IS NULL
     AND NOT public.taller_tiene_acceso(o.id);
  PERFORM pg_temp.c('ningun taller activo sin fecha pierde el acceso', _n = 0, 'afectados=' || _n);
END $$;

ROLLBACK;
