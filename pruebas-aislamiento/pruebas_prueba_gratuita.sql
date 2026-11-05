\set ON_ERROR_STOP off
SET client_min_messages TO NOTICE;
BEGIN;
CREATE OR REPLACE FUNCTION pg_temp.c(_n text,_ok boolean,_d text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  RAISE NOTICE '%  %  %', CASE WHEN _ok THEN 'OK    ' ELSE 'FALLA ' END, rpad(_n,58), _d; END $$;

DO $$
DECLARE
  _nuevo uuid := '22222222-0000-0000-0000-000000000001';
  _due   uuid := '22222222-0000-0000-0000-000000000002';
  _org   public.organizations;
  _i integer;
BEGIN
  INSERT INTO auth.users (id,email) VALUES (_due,'nuevo@p.local');

  -- Un taller nuevo intentando colarse el plan completo para siempre.
  INSERT INTO public.organizations (id,name,slug,owner_id,plan,estado_suscripcion,
                                    suscripcion_termina_en)
  VALUES (_nuevo,'Taller Nuevo','taller-nuevo',_due,
          'completo','activa', now() + interval '10 years');

  SELECT * INTO _org FROM public.organizations WHERE id=_nuevo;
  PERFORM pg_temp.c('arranca en prueba aunque pidiera "activa"', _org.estado_suscripcion = 'prueba', _org.estado_suscripcion::text);
  PERFORM pg_temp.c('con el plan completo para que lo vea todo', _org.plan = 'completo', _org.plan);
  PERFORM pg_temp.c('la prueba dura 14 dias',
    _org.prueba_termina_en::date = (now() + interval '14 days')::date);
  PERFORM pg_temp.c('y le borra la fecha de 10 anos que se habia puesto',
    _org.suscripcion_termina_en IS NULL);
  PERFORM pg_temp.c('durante la prueba tiene acceso', public.taller_tiene_acceso(_nuevo));
  PERFORM pg_temp.c('y durante la prueba puede usar las citas web',
    public.taller_puede('citas_web', _nuevo));

  -- Mete ocho coches durante la prueba. Con el plan completo no hay limite.
  FOR _i IN 1..8 LOOP
    INSERT INTO public.vehicles (organization_id,plate,brand,model,status)
    VALUES (_nuevo,'PR'||_i,'M','M','recibido');
  END LOOP;
  PERFORM pg_temp.c('durante la prueba mete 8 coches sin problema',
    (SELECT count(*) FROM public.vehicles WHERE organization_id=_nuevo) = 8);
END $$;

-- Se acaba la prueba.
DO $$
DECLARE
  _nuevo uuid := '22222222-0000-0000-0000-000000000001';
  _n integer; _falla boolean := false; _org public.organizations;
BEGIN
  UPDATE public.organizations SET prueba_termina_en = now() - interval '1 hour'
   WHERE id=_nuevo;

  PERFORM pg_temp.c('justo al caducar, se le cortaria el acceso',
    NOT public.taller_tiene_acceso(_nuevo));

  _n := public.cerrar_pruebas_caducadas();
  PERFORM pg_temp.c('el proceso diario la cierra', _n = 1, 'cerradas=' || _n);

  SELECT * INTO _org FROM public.organizations WHERE id=_nuevo;
  PERFORM pg_temp.c('baja al plan gratuito', _org.plan = 'gratis', _org.plan);
  PERFORM pg_temp.c('y NO se le echa: sigue entrando', public.taller_tiene_acceso(_nuevo));

  PERFORM pg_temp.c('conserva los 8 coches que metio',
    (SELECT count(*) FROM public.vehicles WHERE organization_id=_nuevo) = 8);

  BEGIN
    INSERT INTO public.vehicles (organization_id,plate,brand,model,status)
    VALUES (_nuevo,'PR9','M','M','recibido');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.c('pero ya no puede meter uno mas', _falla);

  PERFORM pg_temp.c('y pierde las citas web', NOT public.taller_puede('citas_web', _nuevo));
  PERFORM pg_temp.c('y el registro de jornada',
    NOT public.taller_puede('registro_jornada', _nuevo));
END $$;

-- Los talleres que ya existian no se tocan.
DO $$
BEGIN
  PERFORM pg_temp.c('ningun taller anterior ha quedado en prueba',
    NOT EXISTS (SELECT 1 FROM public.organizations
                 WHERE estado_suscripcion='prueba'
                   AND created_at < now() - interval '1 minute'));
END $$;
ROLLBACK;
