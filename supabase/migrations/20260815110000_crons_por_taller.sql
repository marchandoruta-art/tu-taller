-- Tareas programadas: de globales a por taller.
--
-- Las tres tareas automaticas daban por hecho que solo existe un taller:
--
--   cron_auto_clock_out()      cerraba TODAS las jornadas abiertas de la base entera.
--   cron_auto_clock_in()       fichaba a las 08:00 Europe/Madrid para todo el mundo.
--   auto_stop_vehicle_timers() paraba TODOS los cronometros a las 17:15 Europe/Madrid.
--
-- Con un solo taller funciona. Con varios, el horario de uno decide la hora de salida
-- de los trabajadores de los demas.
--
-- Ademas habia un fallo de zona horaria: se programaban dos tareas, una "de invierno"
-- y otra "de verano", pero ambas quedaban activas a la vez. La primera en saltar
-- cerraba todo, asi que la de invierno nunca llegaba a actuar y de noviembre a marzo
-- la jornada se cerraba a las 15:00 en vez de a las 16:00. Una hora de trabajo menos
-- registrada cada dia.
--
-- Solucion: cada taller lleva su horario y su zona horaria, las tareas se ejecutan a
-- menudo y cada una decide, taller por taller, si le toca. Se elimina el apaño
-- invierno/verano: la zona horaria ya resuelve el cambio de hora.
--
-- Los valores por defecto reproducen el comportamiento actual, asi que para el taller
-- que ya esta en produccion no cambia nada salvo el fallo de invierno.
--
-- NOTA: esto arregla el reparto por taller y la hora. NO convierte el registro
-- automatico en un registro de jornada valido: seguir fabricando una entrada a las
-- 08:00 para quien no ha fichado es una decision del cliente, no tecnica. Por eso se
-- añade `attendance_auto_enabled`, para que cada taller pueda desactivarlo.

-- 1. Horario propio de cada taller.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS time_zone                text    NOT NULL DEFAULT 'Europe/Madrid',
  ADD COLUMN IF NOT EXISTS attendance_auto_enabled  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attendance_start         time    NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS attendance_end           time    NOT NULL DEFAULT '16:00',
  ADD COLUMN IF NOT EXISTS vehicle_timer_cutoff     time    NOT NULL DEFAULT '17:15';

COMMENT ON COLUMN public.organizations.time_zone IS
  'Zona horaria del taller. Resuelve el cambio de hora sin tareas duplicadas.';
COMMENT ON COLUMN public.organizations.attendance_auto_enabled IS
  'Si esta activo, se abre una jornada automatica a quien no haya fichado.';

-- Una zona horaria invalida dejaria la tarea abortando en silencio cada 15 minutos.
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_time_zone_valida;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_time_zone_valida
  CHECK (now() AT TIME ZONE time_zone IS NOT NULL) NOT VALID;

-- 2. Apertura automatica de jornada, taller por taller.
--
-- Las tres funciones reciben el instante sobre el que actuar, con `now()` por defecto.
-- El cron las sigue llamando sin argumentos. Sirve para poder comprobarlas en un dia y
-- una hora concretos: el fallo de invierno que corrige esta migracion paso inadvertido
-- justamente porque no habia forma de ejecutarlas fuera del momento actual.
DROP FUNCTION IF EXISTS public.cron_auto_clock_in();
DROP FUNCTION IF EXISTS public.cron_auto_clock_out();
DROP FUNCTION IF EXISTS public.auto_stop_vehicle_timers();

CREATE OR REPLACE FUNCTION public.cron_auto_clock_in(_instante timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org      record;
  _ahora    timestamp;   -- hora local del taller
  _hoy      date;
  _inicio   timestamptz;
  _fin      timestamptz;
  _total    integer := 0;
  _n        integer;
BEGIN
  FOR _org IN
    SELECT id, time_zone, attendance_start, attendance_end
    FROM public.organizations
    WHERE attendance_auto_enabled
  LOOP
    _ahora := _instante AT TIME ZONE _org.time_zone;
    _hoy   := _ahora::date;

    -- Fin de semana en la zona del taller, no en la del servidor.
    CONTINUE WHEN EXTRACT(ISODOW FROM _hoy) > 5;

    _inicio := (_hoy::text || ' ' || _org.attendance_start::text)::timestamp
                 AT TIME ZONE _org.time_zone;
    _fin    := (_hoy::text || ' ' || _org.attendance_end::text)::timestamp
                 AT TIME ZONE _org.time_zone;

    -- Ni antes de abrir ni despues de cerrar: fuera de esa franja no se abre nada.
    CONTINUE WHEN _instante < _inicio OR _instante >= _fin;

    INSERT INTO public.attendance_logs (user_id, organization_id, clock_in, exit_type)
    SELECT p.user_id, p.organization_id, _inicio, NULL
    FROM public.profiles p
    WHERE p.organization_id = _org.id
      AND NOT EXISTS (
        SELECT 1 FROM public.attendance_logs a
        WHERE a.user_id = p.user_id
          AND a.clock_in >= (_hoy::text || ' 00:00:00')::timestamp AT TIME ZONE _org.time_zone
          AND a.clock_in <  ((_hoy + 1)::text || ' 00:00:00')::timestamp AT TIME ZONE _org.time_zone
      );

    GET DIAGNOSTICS _n = ROW_COUNT;
    _total := _total + _n;
  END LOOP;

  RETURN _total;
END;
$function$;

-- 3. Cierre automatico de jornada, taller por taller.
CREATE OR REPLACE FUNCTION public.cron_auto_clock_out(_instante timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org   record;
  _total integer := 0;
  _n     integer;
BEGIN
  FOR _org IN
    SELECT id, time_zone, attendance_end
    FROM public.organizations
  LOOP
    -- La hora de cierre se calcula sobre el dia de cada registro, no sobre hoy: asi
    -- se cierran tambien las jornadas que quedaron abiertas de dias anteriores, y
    -- cada una con la hora que le correspondia.
    WITH pendientes AS (
      SELECT a.id,
             a.clock_in,
             (((a.clock_in AT TIME ZONE _org.time_zone)::date::text || ' ' ||
               _org.attendance_end::text)::timestamp AT TIME ZONE _org.time_zone) AS fin
      FROM public.attendance_logs a
      WHERE a.organization_id = _org.id
        AND a.clock_out IS NULL
    ), cerradas AS (
      UPDATE public.attendance_logs a
      SET clock_out     = p.fin,
          total_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (p.fin - a.clock_in)) / 60))::int,
          exit_type     = 'auto_16h'   -- etiqueta conservada: el frontend la tiene fijada
      FROM pendientes p
      WHERE p.id = a.id
        AND p.fin <= _instante
        -- Un fichaje posterior a la hora de cierre daria una salida anterior a la
        -- entrada. Se deja abierto a proposito para que lo revise una persona.
        AND p.fin > a.clock_in
      RETURNING 1
    )
    SELECT count(*) INTO _n FROM cerradas;

    _total := _total + _n;
  END LOOP;

  RETURN _total;
END;
$function$;

-- 4. Parada de cronometros de vehiculo, taller por taller.
CREATE OR REPLACE FUNCTION public.auto_stop_vehicle_timers(_instante timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org   record;
  _ahora timestamp;
  _hoy   date;
  _total integer := 0;
  _n     integer;
BEGIN
  FOR _org IN
    SELECT id, time_zone, vehicle_timer_cutoff
    FROM public.organizations
  LOOP
    _ahora := _instante AT TIME ZONE _org.time_zone;
    _hoy   := _ahora::date;

    CONTINUE WHEN EXTRACT(ISODOW FROM _hoy) > 5;
    CONTINUE WHEN _ahora::time < _org.vehicle_timer_cutoff;

    -- Si el taller tiene fiesta hoy, no se tocan sus cronometros.
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.organization_holidays h
      WHERE h.organization_id = _org.id AND h.date = _hoy
    );

    WITH paradas AS (
      UPDATE public.time_logs t
      SET ended_at      = _instante,
          total_minutes = GREATEST(1, CEIL(EXTRACT(EPOCH FROM (_instante - t.started_at)) / 60))::int
      WHERE t.organization_id = _org.id
        AND t.ended_at IS NULL
      RETURNING 1
    )
    SELECT count(*) INTO _n FROM paradas;

    _total := _total + _n;
  END LOOP;

  RETURN _total;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cron_auto_clock_in(timestamptz)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_auto_clock_out(timestamptz)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_stop_vehicle_timers(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cron_auto_clock_in(timestamptz)       TO postgres;
GRANT  EXECUTE ON FUNCTION public.cron_auto_clock_out(timestamptz)      TO postgres;
GRANT  EXECUTE ON FUNCTION public.auto_stop_vehicle_timers(timestamptz) TO postgres;

-- 5. Una sola programacion para cada tarea, sin duplicar invierno y verano.
DO $$
DECLARE
  _j record;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'pg_cron no disponible: se omite la reprogramacion.';
    RETURN;
  END IF;

  FOR _j IN SELECT jobname FROM cron.job WHERE jobname IN (
    'auto-clock-in-8am-winter',       'auto-clock-in-8am-summer',
    'auto-clock-out-4pm-winter',      'auto-clock-out-4pm-summer',
    'check-attendance-8h',
    'auto-stop-vehicle-timers-summer','auto-stop-vehicle-timers-winter',
    'auto-stop-vehicle-timers-summer-evening',
    'auto-stop-vehicle-timers-winter-evening',
    'auto-stop-vehicle-timers-summer-safety',
    'auto-stop-vehicle-timers-winter-safety'
  ) LOOP
    PERFORM cron.unschedule(_j.jobname);
  END LOOP;

  -- Cada cuarto de hora. Las funciones deciden a que taller le toca, asi que ejecutar
  -- de mas no tiene efecto: son idempotentes.
  PERFORM cron.schedule('asistencia-apertura', '*/15 * * * *',
                        'SELECT public.cron_auto_clock_in();');
  PERFORM cron.schedule('asistencia-cierre',   '*/15 * * * *',
                        'SELECT public.cron_auto_clock_out();');
  PERFORM cron.schedule('cronometros-parada',  '*/15 * * * *',
                        'SELECT public.auto_stop_vehicle_timers();');
END $$;
