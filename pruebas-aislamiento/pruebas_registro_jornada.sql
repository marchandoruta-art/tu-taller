-- Pruebas dirigidas del registro de jornada.
--
-- Comprueban lo que la bateria de aislamiento no cubre: que el sistema ha dejado
-- de inventar horas, que todo cambio deja rastro y que el borrado esta cerrado.
--
-- Cada comprobacion imprime OK o FALLA con lo esperado y lo obtenido.

\set ON_ERROR_STOP off
SET client_min_messages TO NOTICE;

BEGIN;

-- Datos de partida: un taller, un jefe y un mecanico.
DO $$
DECLARE
  _org   uuid := '11111111-1111-1111-1111-111111111111';
  _jefe  uuid := '22222222-2222-2222-2222-222222222222';
  _mec   uuid := '33333333-3333-3333-3333-333333333333';
BEGIN
  -- El alta de cuenta dispara `handle_new_user`, que ya crea perfil y rol sin
  -- taller. Aqui solo se les asigna el taller y el rol que toca.
  INSERT INTO auth.users (id, email)
  VALUES (_jefe, 'jefe@prueba.local'), (_mec, 'mecanico@prueba.local');

  INSERT INTO public.organizations (id, name, slug, owner_id, time_zone, attendance_end)
  VALUES (_org, 'Taller de prueba', 'taller-de-prueba', _jefe, 'Europe/Madrid', '16:00');

  INSERT INTO public.profiles (user_id, organization_id, full_name)
  VALUES (_jefe, _org, 'Jefe'), (_mec, _org, 'Mecanico')
  ON CONFLICT (user_id) DO UPDATE
    SET organization_id = EXCLUDED.organization_id, full_name = EXCLUDED.full_name;

  DELETE FROM public.user_roles WHERE user_id IN (_jefe, _mec);
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (_jefe, _org, 'admin'), (_mec, _org, 'mecanico');
END $$;

-- Utilidad para reportar.
CREATE OR REPLACE FUNCTION pg_temp.comprobar(_nombre text, _ok boolean, _detalle text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RAISE NOTICE '%  %  %', CASE WHEN _ok THEN 'OK    ' ELSE 'FALLA ' END, rpad(_nombre, 52), _detalle;
END $$;

-- ---------------------------------------------------------------------------
-- 1. La fabricacion de entradas ha desaparecido.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM pg_temp.comprobar(
    'cron_auto_clock_in ya no existe',
    NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cron_auto_clock_in'));

  PERFORM pg_temp.comprobar(
    'cron_auto_clock_out ya no existe',
    NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cron_auto_clock_out'));

  PERFORM pg_temp.comprobar(
    'existe la funcion de aviso',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cron_avisar_jornadas_abiertas'));

  PERFORM pg_temp.comprobar(
    'columna attendance_auto_enabled retirada',
    NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'organizations' AND column_name = 'attendance_auto_enabled'));
END $$;

-- ---------------------------------------------------------------------------
-- 2. El aviso avisa y NO cierra.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  _org  uuid := '11111111-1111-1111-1111-111111111111';
  _mec  uuid := '33333333-3333-3333-3333-333333333333';
  _log  uuid;
  _n    integer;
  _avisos integer;
BEGIN
  -- Jornada de ayer que quedo abierta.
  INSERT INTO public.attendance_logs (user_id, organization_id, clock_in)
  VALUES (_mec, _org, '2026-01-15 08:00:00+01')
  RETURNING id INTO _log;

  _n := public.cron_avisar_jornadas_abiertas('2026-01-16 09:00:00+01'::timestamptz);
  PERFORM pg_temp.comprobar('el aviso detecta la jornada abierta', _n = 1, 'avisadas=' || _n);

  PERFORM pg_temp.comprobar(
    'la jornada SIGUE abierta (no se inventa la salida)',
    (SELECT clock_out IS NULL FROM public.attendance_logs WHERE id = _log));

  SELECT count(*) INTO _avisos FROM public.notifications
  WHERE organization_id = _org AND type IN ('jornada_sin_cerrar', 'jornada_sin_cerrar_admin');
  PERFORM pg_temp.comprobar('avisa al trabajador y a la direccion', _avisos = 2, 'avisos=' || _avisos);

  -- Segunda pasada: no debe repetir.
  _n := public.cron_avisar_jornadas_abiertas('2026-01-16 10:00:00+01'::timestamptz);
  PERFORM pg_temp.comprobar('no repite el aviso cada cuarto de hora', _n = 0, 'avisadas=' || _n);
END $$;

-- ---------------------------------------------------------------------------
-- 3. Todo cambio deja rastro.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  _org uuid := '11111111-1111-1111-1111-111111111111';
  _n   integer;
BEGIN
  SELECT count(*) INTO _n FROM public.audit_log
  WHERE organization_id = _org AND action = 'jornada_creada';
  PERFORM pg_temp.comprobar('el alta de jornada queda en la traza', _n = 1, 'entradas=' || _n);
END $$;

-- ---------------------------------------------------------------------------
-- 4. El borrado esta cerrado.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  _log uuid;
  _bloqueado boolean := false;
BEGIN
  SELECT id INTO _log FROM public.attendance_logs
   WHERE organization_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  BEGIN
    DELETE FROM public.attendance_logs WHERE id = _log;
  EXCEPTION WHEN OTHERS THEN
    _bloqueado := true;
  END;
  PERFORM pg_temp.comprobar('no se puede borrar un fichaje', _bloqueado);
END $$;

-- ---------------------------------------------------------------------------
-- 5. La hora de entrada no se reescribe por la via normal.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  _log uuid;
  _bloqueado boolean := false;
BEGIN
  SELECT id INTO _log FROM public.attendance_logs
   WHERE organization_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
  BEGIN
    UPDATE public.attendance_logs SET clock_in = clock_in - interval '2 hours' WHERE id = _log;
  EXCEPTION WHEN OTHERS THEN
    _bloqueado := true;
  END;
  PERFORM pg_temp.comprobar('no se puede mover la hora de entrada', _bloqueado);
END $$;

-- ---------------------------------------------------------------------------
-- 6. La correccion exige motivo, exige direccion y recalcula.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  _jefe uuid := '22222222-2222-2222-2222-222222222222';
  _mec  uuid := '33333333-3333-3333-3333-333333333333';
  _log  uuid;
  _falla boolean;
  _fila public.attendance_logs;
BEGIN
  SELECT id INTO _log FROM public.attendance_logs
   WHERE organization_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;

  -- Sin motivo.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _jefe)::text, true);
  _falla := false;
  BEGIN
    PERFORM public.corregir_jornada(_log, '2026-01-15 08:00:00+01', '2026-01-15 16:00:00+01', '');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.comprobar('la correccion sin motivo se rechaza', _falla);

  -- Como mecanico.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _mec)::text, true);
  _falla := false;
  BEGIN
    PERFORM public.corregir_jornada(_log, '2026-01-15 08:00:00+01', '2026-01-15 16:00:00+01',
                                    'Se me olvido fichar la salida');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.comprobar('un mecanico no puede corregir jornadas', _falla);

  -- Salida anterior a la entrada.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _jefe)::text, true);
  _falla := false;
  BEGIN
    PERFORM public.corregir_jornada(_log, '2026-01-15 08:00:00+01', '2026-01-15 07:00:00+01',
                                    'Prueba de salida invertida');
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.comprobar('rechaza salida anterior a la entrada', _falla);

  -- Correccion valida.
  _fila := public.corregir_jornada(_log, '2026-01-15 08:00:00+01', '2026-01-15 16:00:00+01',
                                   'El mecanico olvido fichar la salida');
  PERFORM pg_temp.comprobar('la correccion valida calcula 480 minutos',
                            _fila.total_minutes = 480, 'minutos=' || _fila.total_minutes);
  PERFORM pg_temp.comprobar('queda marcada como correccion', _fila.origen = 'correccion', _fila.origen);
  PERFORM pg_temp.comprobar('guarda el motivo', _fila.motivo IS NOT NULL, _fila.motivo);
  PERFORM pg_temp.comprobar('guarda quien la hizo', _fila.corregido_por = _jefe);

  PERFORM pg_temp.comprobar('la correccion queda en la traza',
    EXISTS (SELECT 1 FROM public.audit_log
            WHERE action = 'jornada_modificada' AND entity_id = _log));
END $$;

-- ---------------------------------------------------------------------------
-- 7. Conservacion de cuatro anos.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  _org uuid := '11111111-1111-1111-1111-111111111111';
  _mec uuid := '33333333-3333-3333-3333-333333333333';
  _n   integer;
BEGIN
  PERFORM set_config('request.jwt.claims', NULL, true);

  INSERT INTO public.attendance_logs (user_id, organization_id, clock_in, clock_out, total_minutes)
  VALUES (_mec, _org, now() - interval '5 years', now() - interval '5 years' + interval '8 hours', 480),
         (_mec, _org, now() - interval '1 year',  now() - interval '1 year'  + interval '8 hours', 480);

  _n := public.purgar_jornadas_caducadas();
  PERFORM pg_temp.comprobar('la purga borra solo lo de mas de 4 anos', _n = 1, 'borradas=' || _n);

  PERFORM pg_temp.comprobar('el registro de hace un ano sigue ahi',
    EXISTS (SELECT 1 FROM public.attendance_logs
            WHERE clock_in < now() - interval '6 months' AND clock_in > now() - interval '2 years'));
END $$;

-- ---------------------------------------------------------------------------
-- 8. El historico fabricado queda marcado.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  _marcadas integer;
BEGIN
  SELECT count(*) INTO _marcadas FROM public.attendance_logs WHERE origen = 'automatico_historico';
  PERFORM pg_temp.comprobar('existe la marca de historico automatico',
    EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'attendance_logs' AND column_name = 'origen'),
    'filas marcadas en este entorno=' || _marcadas);
END $$;

ROLLBACK;
