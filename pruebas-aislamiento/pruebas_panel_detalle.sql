\set ON_ERROR_STOP off
SET client_min_messages TO NOTICE;
BEGIN;
CREATE OR REPLACE FUNCTION pg_temp.comprobar(_n text, _ok boolean, _d text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN RAISE NOTICE '%  %  %', CASE WHEN _ok THEN 'OK    ' ELSE 'FALLA ' END, rpad(_n,48), _d; END $$;

DO $$
DECLARE
  _org uuid := '11111111-1111-1111-1111-111111111111';
  _jefe uuid := '22222222-2222-2222-2222-222222222222';
  _mec uuid := '33333333-3333-3333-3333-333333333333';
BEGIN
  INSERT INTO auth.users (id, email, last_sign_in_at)
  VALUES (_jefe,'jefe@p.local', now() - interval '2 days'),
         (_mec, 'mec@p.local',  now() - interval '9 days');
  INSERT INTO public.organizations (id,name,slug,owner_id) VALUES (_org,'Taller X','taller-x',_jefe);
  INSERT INTO public.profiles (user_id,organization_id,full_name)
  VALUES (_jefe,_org,'Jefe X'),(_mec,_org,'Mec X')
  ON CONFLICT (user_id) DO UPDATE SET organization_id=_org, full_name=EXCLUDED.full_name;
  DELETE FROM public.user_roles WHERE user_id IN (_jefe,_mec);
  INSERT INTO public.user_roles (user_id,organization_id,role)
  VALUES (_jefe,_org,'admin'),(_mec,_org,'mecanico');
  INSERT INTO public.propietarios_plataforma (user_id) VALUES (_jefe) ON CONFLICT DO NOTHING;
END $$;

-- Sin ser propietario
DO $$
DECLARE _falla boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333')::text, true);
  BEGIN PERFORM public.panel_propietario_detalle('11111111-1111-1111-1111-111111111111');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.comprobar('un mecanico no ve el detalle', _falla);

  _falla := false;
  BEGIN PERFORM public.panel_propietario_cambiar_plan('11111111-1111-1111-1111-111111111111','pro');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.comprobar('un mecanico no cambia el plan', _falla);
END $$;

-- Como propietario
DO $$
DECLARE _d record; _falla boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222')::text, true);
  SELECT * INTO _d FROM public.panel_propietario_detalle('11111111-1111-1111-1111-111111111111');

  PERFORM pg_temp.comprobar('devuelve el taller', _d.nombre = 'Taller X', _d.nombre);
  PERFORM pg_temp.comprobar('da el contacto de quien manda', _d.contacto_correo = 'jefe@p.local', _d.contacto_correo);
  PERFORM pg_temp.comprobar('cuenta 2 personas', _d.personas_total = 2, 'total=' || _d.personas_total);
  PERFORM pg_temp.comprobar('desglosa por rol sin dar nombres',
    _d.personas_por_rol ? 'admin' AND _d.personas_por_rol ? 'mecanico', _d.personas_por_rol::text);
  PERFORM pg_temp.comprobar('el ultimo acceso es el mas reciente de los dos',
    _d.ultimo_acceso::date = (now() - interval '2 days')::date);

  -- Cambiar plan y estado
  PERFORM public.panel_propietario_cambiar_plan('11111111-1111-1111-1111-111111111111','profesional');
  PERFORM pg_temp.comprobar('cambia el plan',
    (SELECT plan FROM public.organizations WHERE id='11111111-1111-1111-1111-111111111111') = 'profesional');

  _falla := false;
  BEGIN PERFORM public.panel_propietario_cambiar_plan('11111111-1111-1111-1111-111111111111','gratis-total');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.comprobar('rechaza un plan inventado', _falla);

  PERFORM public.panel_propietario_cambiar_estado('11111111-1111-1111-1111-111111111111','pago_pendiente');
  PERFORM pg_temp.comprobar('marca el pago pendiente',
    (SELECT estado_suscripcion FROM public.organizations WHERE id='11111111-1111-1111-1111-111111111111') = 'pago_pendiente');

  PERFORM public.panel_propietario_cambiar_estado('11111111-1111-1111-1111-111111111111','cancelada');
  PERFORM pg_temp.comprobar('al cancelar deja fecha de baja',
    (SELECT dado_de_baja_en IS NOT NULL FROM public.organizations WHERE id='11111111-1111-1111-1111-111111111111'));

  PERFORM public.panel_propietario_cambiar_estado('11111111-1111-1111-1111-111111111111','activa', now() + interval '30 days');
  PERFORM pg_temp.comprobar('al reactivar borra la baja y pone vencimiento',
    (SELECT dado_de_baja_en IS NULL AND suscripcion_termina_en > now()
       FROM public.organizations WHERE id='11111111-1111-1111-1111-111111111111'));
END $$;

ROLLBACK;
