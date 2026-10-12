-- Pruebas de la solicitud de cita publica.
\set ON_ERROR_STOP off
SET client_min_messages TO NOTICE;
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.comprobar(_n text, _ok boolean, _d text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RAISE NOTICE '%  %  %', CASE WHEN _ok THEN 'OK    ' ELSE 'FALLA ' END, rpad(_n, 50), _d;
END $$;

DO $$
DECLARE
  _org  uuid := '11111111-1111-1111-1111-111111111111';
  _jefe uuid := '22222222-2222-2222-2222-222222222222';
BEGIN
  INSERT INTO auth.users (id, email) VALUES (_jefe, 'jefe@prueba.local');
  INSERT INTO public.organizations (id, name, slug, owner_id,
    citas_web_activas, citas_dias, citas_desde, citas_hasta,
    citas_duracion_min, citas_por_franja, citas_servicios, citas_avisos)
  VALUES (_org, 'Taller de prueba', 'taller-prueba', _jefe,
    true, '{1,2,3,4,5}', '08:00', '10:00', 30, 1,
    '{"Mecánica general","Pre ITV","Electricidad"}',
    '{"El vehículo queda bajo custodia del taller.","El presupuesto es una estimación."}');
  INSERT INTO public.profiles (user_id, organization_id, full_name)
  VALUES (_jefe, _org, 'Jefe') ON CONFLICT (user_id) DO UPDATE SET organization_id = _org;
  DELETE FROM public.user_roles WHERE user_id = _jefe;
  INSERT INTO public.user_roles (user_id, organization_id, role) VALUES (_jefe, _org, 'admin');
END $$;

-- 1. Configuracion publica
DO $$
DECLARE _c record;
BEGIN
  SELECT * INTO _c FROM public.cita_publica_config('taller-prueba');
  PERFORM pg_temp.comprobar('devuelve el nombre del taller', _c.nombre = 'Taller de prueba', _c.nombre);
  PERFORM pg_temp.comprobar('devuelve los 3 servicios', array_length(_c.servicios,1) = 3);
  PERFORM pg_temp.comprobar('devuelve los 2 avisos', array_length(_c.avisos,1) = 2);

  PERFORM pg_temp.comprobar('un taller que no existe no devuelve nada',
    NOT EXISTS (SELECT 1 FROM public.cita_publica_config('no-existe')));

  UPDATE public.organizations SET citas_web_activas = false WHERE slug = 'taller-prueba';
  PERFORM pg_temp.comprobar('con las citas web apagadas no devuelve nada',
    NOT EXISTS (SELECT 1 FROM public.cita_publica_config('taller-prueba')));
  UPDATE public.organizations SET citas_web_activas = true WHERE slug = 'taller-prueba';
END $$;

-- 2. Huecos
DO $$
DECLARE
  _lunes date := (date_trunc('week', CURRENT_DATE) + interval '7 days')::date;
  _n integer;
  _sabado integer;
BEGIN
  SELECT count(*) INTO _n FROM public.cita_publica_huecos('taller-prueba', _lunes, 1);
  PERFORM pg_temp.comprobar('de 8 a 10 con citas de 30 min salen 4 huecos', _n = 4, 'huecos=' || _n);

  SELECT count(*) INTO _sabado
    FROM public.cita_publica_huecos('taller-prueba', (_lunes + 5), 1);
  PERFORM pg_temp.comprobar('el sabado esta cerrado', _sabado = 0, 'huecos=' || _sabado);

  SELECT count(*) INTO _n FROM public.cita_publica_huecos('taller-prueba', _lunes, 7);
  PERFORM pg_temp.comprobar('una semana da 5 dias x 4 huecos', _n = 20, 'huecos=' || _n);
END $$;

-- 3. Solicitar
DO $$
DECLARE
  _lunes date := (date_trunc('week', CURRENT_DATE) + interval '7 days')::date;
  _r record;
  _falla boolean;
  _n integer;
BEGIN
  SELECT * INTO _r FROM public.cita_publica_solicitar(
    'taller-prueba','Juan','Perez','600111222','juan@ejemplo.com','DNI','12345678Z',
    'Volkswagen','Tiguan',2020,'8455LKD', '{"Mecánica general"}','Ruido al frenar',
    _lunes,'08:00','Juan Perez');
  PERFORM pg_temp.comprobar('la solicitud se registra', _r.id IS NOT NULL);
  PERFORM pg_temp.comprobar('devuelve el token de confirmacion', _r.token IS NOT NULL);

  PERFORM pg_temp.comprobar('queda como web y pendiente',
    EXISTS (SELECT 1 FROM public.appointments
            WHERE id = _r.id AND origen = 'web' AND confirmation_status = 'pendiente'
              AND firma = 'Juan Perez' AND avisos_aceptados_en IS NOT NULL));

  SELECT count(*) INTO _n FROM public.cita_publica_huecos('taller-prueba', _lunes, 1);
  PERFORM pg_temp.comprobar('ese hueco ya no aparece libre', _n = 3, 'quedan=' || _n);

  SELECT count(*) INTO _n FROM public.notifications
   WHERE type = 'cita_solicitada' AND organization_id = '11111111-1111-1111-1111-111111111111';
  PERFORM pg_temp.comprobar('avisa a la direccion', _n = 1, 'avisos=' || _n);

  -- Mismo hueco otra vez
  _falla := false;
  BEGIN
    PERFORM public.cita_publica_solicitar('taller-prueba','Ana','Lopez','600333444','a@b.com','DNI','1X',
      'Seat','Ibiza',2019,'1234ABC','{"Pre ITV"}',NULL,_lunes,'08:00','Ana Lopez');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.comprobar('no deja coger un hueco ya ocupado', _falla);

  -- Firma que no coincide
  _falla := false;
  BEGIN
    PERFORM public.cita_publica_solicitar('taller-prueba','Ana','Lopez','600333444','a@b.com','DNI','1X',
      'Seat','Ibiza',2019,'1234ABC','{"Pre ITV"}',NULL,_lunes,'08:30','Pedro Garcia');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.comprobar('rechaza una firma que no es el nombre', _falla);

  -- Sin servicios
  _falla := false;
  BEGIN
    PERFORM public.cita_publica_solicitar('taller-prueba','Ana','Lopez','600333444','a@b.com','DNI','1X',
      'Seat','Ibiza',2019,'1234ABC','{}',NULL,_lunes,'08:30','Ana Lopez');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.comprobar('exige al menos un servicio', _falla);

  -- Fecha pasada
  _falla := false;
  BEGIN
    PERFORM public.cita_publica_solicitar('taller-prueba','Ana','Lopez','600333444','a@b.com','DNI','1X',
      'Seat','Ibiza',2019,'1234ABC','{"Pre ITV"}',NULL,CURRENT_DATE - 3,'08:30','Ana Lopez');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.comprobar('rechaza una fecha ya pasada', _falla);

  -- Abuso: cuarta con el mismo telefono
  PERFORM public.cita_publica_solicitar('taller-prueba','Juan','Perez','600111222','juan@ejemplo.com','DNI','12345678Z',
    'VW','Tiguan',2020,'8455LKD','{"Pre ITV"}',NULL,_lunes,'08:30','Juan Perez');
  PERFORM public.cita_publica_solicitar('taller-prueba','Juan','Perez','600111222','juan@ejemplo.com','DNI','12345678Z',
    'VW','Tiguan',2020,'8455LKD','{"Pre ITV"}',NULL,_lunes,'09:00','Juan Perez');
  _falla := false;
  BEGIN
    PERFORM public.cita_publica_solicitar('taller-prueba','Juan','Perez','600111222','juan@ejemplo.com','DNI','12345678Z',
      'VW','Tiguan',2020,'8455LKD','{"Pre ITV"}',NULL,_lunes,'09:30','Juan Perez');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.comprobar('corta al cuarto intento con los mismos datos', _falla);
END $$;

-- 4. Una cita a deshora tiene que ocupar su franja igualmente.
DO $$
DECLARE
  _martes date := (date_trunc('week', CURRENT_DATE) + interval '8 days')::date;
  _n integer;
BEGIN
  SELECT count(*) INTO _n FROM public.cita_publica_huecos('taller-prueba', _martes, 1);
  PERFORM pg_temp.comprobar('el martes empieza con 4 huecos', _n = 4, 'huecos=' || _n);

  -- El taller apunta una por telefono a las 08:15, fuera de la rejilla.
  INSERT INTO public.appointments
    (organization_id, appointment_date, appointment_time, client_name, origen)
  VALUES ('11111111-1111-1111-1111-111111111111', _martes, '08:15', 'Cliente de telefono', 'taller');

  SELECT count(*) INTO _n FROM public.cita_publica_huecos('taller-prueba', _martes, 1);
  PERFORM pg_temp.comprobar('una cita a las 08:15 ocupa la franja de las 08:00', _n = 3, 'quedan=' || _n);

  PERFORM pg_temp.comprobar('y la de las 08:30 sigue libre',
    EXISTS (SELECT 1 FROM public.cita_publica_huecos('taller-prueba', _martes, 1) WHERE hora = '08:30'));
END $$;

ROLLBACK;
