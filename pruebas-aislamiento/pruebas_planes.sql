\set ON_ERROR_STOP off
SET client_min_messages TO NOTICE;
BEGIN;
CREATE OR REPLACE FUNCTION pg_temp.c(_n text,_ok boolean,_d text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  RAISE NOTICE '%  %  %', CASE WHEN _ok THEN 'OK    ' ELSE 'FALLA ' END, rpad(_n,54), _d; END $$;

DO $$
DECLARE
  _org uuid := '55555555-5555-5555-5555-555555555555';
  _due uuid := '44444444-4444-4444-4444-444444444444';
BEGIN
  INSERT INTO auth.users (id,email) VALUES (_due,'d@p.local');
  INSERT INTO public.organizations (id,name,slug,owner_id,plan)
  VALUES (_org,'Taller Plan','taller-plan',_due,'gratis');
  INSERT INTO public.profiles (user_id,organization_id,full_name) VALUES (_due,_org,'Duena')
  ON CONFLICT (user_id) DO UPDATE SET organization_id=_org;
  DELETE FROM public.user_roles WHERE user_id = _due;
END $$;

-- Lo que incluye cada plan
DO $$
BEGIN
  PERFORM pg_temp.c('existen los tres planes',
    (SELECT count(*) FROM public.planes) = 3);
  PERFORM pg_temp.c('el gratuito no trae registro de jornada',
    NOT (SELECT registro_jornada FROM public.planes WHERE codigo='gratis'));
  PERFORM pg_temp.c('el profesional si lo trae',
    (SELECT registro_jornada FROM public.planes WHERE codigo='profesional'));
  PERFORM pg_temp.c('las citas web solo en el completo',
    (SELECT count(*) FROM public.planes WHERE citas_web) = 1);
  PERFORM pg_temp.c('ningun taller se queda sin plan valido',
    NOT EXISTS (SELECT 1 FROM public.organizations o
                 LEFT JOIN public.planes p ON p.codigo = o.plan
                WHERE p.codigo IS NULL));
END $$;

-- taller_puede
DO $$
DECLARE _org uuid := '55555555-5555-5555-5555-555555555555';
BEGIN
  PERFORM pg_temp.c('en gratis, registro de jornada = no',
    NOT public.taller_puede('registro_jornada', _org));
  UPDATE public.organizations SET plan='profesional' WHERE id=_org;
  PERFORM pg_temp.c('al pasar a profesional, registro de jornada = si',
    public.taller_puede('registro_jornada', _org));
  PERFORM pg_temp.c('pero las citas web siguen en no',
    NOT public.taller_puede('citas_web', _org));
  UPDATE public.organizations SET plan='completo' WHERE id=_org;
  PERFORM pg_temp.c('en completo, citas web = si', public.taller_puede('citas_web', _org));
  PERFORM pg_temp.c('una funcion inventada devuelve no',
    NOT public.taller_puede('volar', _org));
END $$;

-- Limite de usuarios
DO $$
DECLARE
  _org uuid := '55555555-5555-5555-5555-555555555555';
  _falla boolean := false;
BEGIN
  UPDATE public.organizations SET plan='gratis' WHERE id=_org;
  INSERT INTO auth.users (id,email) VALUES
    ('44444444-0000-0000-0000-000000000002','u2@p.local');
  -- handle_new_user ya les pone un rol al crear la cuenta. Si no se quita,
  -- el INSERT de abajo choca con la unicidad y la prueba mediria eso en vez
  -- del limite del plan.
  DELETE FROM public.user_roles
   WHERE user_id IN ('44444444-4444-4444-4444-444444444444',
                     '44444444-0000-0000-0000-000000000002');
  INSERT INTO public.user_roles (user_id,organization_id,role)
  VALUES ('44444444-4444-4444-4444-444444444444',_org,'admin');
  PERFORM pg_temp.c('en gratis entra el primer usuario',
    (SELECT count(*) FROM public.user_roles WHERE organization_id=_org) = 1);

  BEGIN
    INSERT INTO public.user_roles (user_id,organization_id,role)
    VALUES ('44444444-0000-0000-0000-000000000002',_org,'mecanico');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.c('el segundo se rechaza por el limite del plan', _falla);

  UPDATE public.organizations SET plan='profesional' WHERE id=_org;
  _falla := false;
  BEGIN
    INSERT INTO public.user_roles (user_id,organization_id,role)
    VALUES ('44444444-0000-0000-0000-000000000002',_org,'mecanico');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.c('al subir de plan, el segundo ya entra', NOT _falla);
END $$;

-- Limite de vehiculos
DO $$
DECLARE
  _org uuid := '55555555-5555-5555-5555-555555555555';
  _falla boolean := false;
  _i integer;
BEGIN
  UPDATE public.organizations SET plan='gratis' WHERE id=_org;
  FOR _i IN 1..5 LOOP
    INSERT INTO public.vehicles (organization_id, plate, brand, model, status)
    VALUES (_org, 'TEST' || _i, 'M', 'M', 'recibido');
  END LOOP;
  PERFORM pg_temp.c('en gratis caben 5 vehiculos',
    (SELECT count(*) FROM public.vehicles WHERE organization_id=_org) = 5);

  BEGIN
    INSERT INTO public.vehicles (organization_id, plate, brand, model, status)
    VALUES (_org,'TEST6','M','M','recibido');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.c('el sexto se rechaza', _falla);

  -- Al entregar uno, se libera sitio.
  UPDATE public.vehicles SET status='entregado'
   WHERE organization_id=_org AND plate='TEST1';
  _falla := false;
  BEGIN
    INSERT INTO public.vehicles (organization_id, plate, brand, model, status)
    VALUES (_org,'TEST6','M','M','recibido');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.c('al entregar uno, vuelve a caber otro', NOT _falla);
END $$;

-- Las citas web dependen del plan
DO $$
DECLARE _org uuid := '55555555-5555-5555-5555-555555555555';
BEGIN
  UPDATE public.organizations
     SET citas_web_activas=true, plan='profesional' WHERE id=_org;
  PERFORM pg_temp.c('con el interruptor puesto pero plan sin citas, no se ofrece',
    NOT EXISTS (SELECT 1 FROM public.cita_publica_config('taller-plan')));

  UPDATE public.organizations SET plan='completo' WHERE id=_org;
  PERFORM pg_temp.c('al subir al completo, ya se ofrece',
    EXISTS (SELECT 1 FROM public.cita_publica_config('taller-plan')));
END $$;

ROLLBACK;
