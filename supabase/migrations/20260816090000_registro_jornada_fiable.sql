-- Registro de jornada: que deje de inventar horas.
--
-- El art. 34.9 del Estatuto de los Trabajadores obliga a registrar el horario
-- concreto de inicio y fin de cada persona. La palabra que importa es "concreto":
-- el registro tiene que decir lo que paso, no lo que estaba previsto que pasara.
--
-- Hoy el sistema inventa horas en tres sitios distintos:
--
--   1. `cron_auto_clock_in`  fabrica una entrada a las 08:00 a quien no ficho.
--   2. `cron_auto_clock_out` corta a las 16:00 a quien sigue dentro.
--   3. El navegador cierra la jornada solo al llegar a 480 minutos.
--
-- Los tres producen un registro que no corresponde con la realidad. El tercero
-- vive en el frontend y se quita aparte; esta migracion se ocupa de los dos
-- primeros y de lo que faltaba alrededor.
--
-- Lo que se hace aqui:
--
--   - Se suprime la fabricacion de entradas. No se sustituye por nada: si alguien
--     no ficha, no hay registro, y eso es justamente lo que hay que ver.
--   - El cierre automatico pasa a ser un aviso. La jornada abierta se queda
--     abierta y se avisa al trabajador y a la direccion para que alguien la
--     corrija a mano dejando constancia de por que.
--   - Toda alta, modificacion o intento de borrado queda registrado en
--     `audit_log`, que ya existe y ya tiene pantalla y exportacion.
--   - Se bloquea el borrado y se impide reescribir la hora de entrada por la via
--     normal. Las correcciones pasan por una funcion que exige un motivo.
--   - Conservacion de cuatro anos, y purga solo a partir de ahi.
--
-- Lo que NO se hace: decidir que le exige la ley a esta empresa en concreto. Eso
-- lo dice su asesoria laboral. Aqui se implementa la parte tecnica que cualquier
-- interpretacion va a requerir igualmente.

-- 1. Distinguir lo que escribio una persona de lo que escribio una maquina.
--
-- Sin esto, el historico que ya hay en produccion es inservible: no se puede
-- saber que dias son reales y cuales los invento el cron.
ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS origen           text        NOT NULL DEFAULT 'trabajador',
  ADD COLUMN IF NOT EXISTS motivo           text,
  ADD COLUMN IF NOT EXISTS corregido_por    uuid,
  ADD COLUMN IF NOT EXISTS corregido_en     timestamptz,
  ADD COLUMN IF NOT EXISTS aviso_enviado_en timestamptz;

ALTER TABLE public.attendance_logs
  DROP CONSTRAINT IF EXISTS attendance_logs_origen_valido;
ALTER TABLE public.attendance_logs
  ADD CONSTRAINT attendance_logs_origen_valido
  CHECK (origen IN ('trabajador', 'correccion', 'automatico_historico'));

COMMENT ON COLUMN public.attendance_logs.origen IS
  'trabajador = lo ficho una persona. correccion = lo rectifico la direccion con motivo. '
  'automatico_historico = lo genero el cron antes de agosto de 2026, no es fiable.';
COMMENT ON COLUMN public.attendance_logs.motivo IS
  'Obligatorio en las correcciones. Es lo que justifica el cambio ante una inspeccion.';

-- Marcar el historico que se sabe fabricado.
--
-- Solo se puede identificar lo que quedo etiquetado como tal. El cierre del
-- navegador a las 8 horas guardaba `exit_type = 'normal'`, asi que esas filas son
-- indistinguibles de un fichaje real y se quedan sin marcar. Se deja dicho aqui
-- porque es una limitacion del dato, no un olvido: el historico anterior a esta
-- migracion no es integramente fiable y conviene que conste.
UPDATE public.attendance_logs
SET origen = 'automatico_historico'
WHERE exit_type IN ('auto_16h', 'auto_8h')
  AND origen = 'trabajador';

-- 2. Suprimir la fabricacion de entradas.
DO $$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL
     AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'asistencia-apertura') THEN
    PERFORM cron.unschedule('asistencia-apertura');
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.cron_auto_clock_in(timestamptz);
DROP FUNCTION IF EXISTS public.cron_auto_clock_in();

-- Estas dos columnas solo existian para alimentar la funcion que se acaba de
-- borrar. `attendance_end` sobrevive porque el aviso la necesita.
ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS attendance_auto_enabled,
  DROP COLUMN IF EXISTS attendance_start;

-- 3. El cierre automatico pasa a ser un aviso.
--
-- Se mantiene el parametro `_instante` que se introdujo al repartir los crons por
-- taller: sin el no hay forma de comprobar el comportamiento fuera del momento
-- actual, y esa fue la razon de que el fallo de horario de invierno pasara
-- inadvertido durante meses.
DROP FUNCTION IF EXISTS public.cron_auto_clock_out(timestamptz);
DROP FUNCTION IF EXISTS public.cron_auto_clock_out();

CREATE OR REPLACE FUNCTION public.cron_avisar_jornadas_abiertas(_instante timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org      record;
  _pend     record;
  _dia      date;
  _mensaje  text;
  _total    integer := 0;
BEGIN
  FOR _org IN
    SELECT id, time_zone, attendance_end
    FROM public.organizations
  LOOP
    FOR _pend IN
      SELECT a.id, a.user_id, a.clock_in,
             (a.clock_in AT TIME ZONE _org.time_zone)::date AS dia_local
      FROM public.attendance_logs a
      WHERE a.organization_id = _org.id
        AND a.clock_out IS NULL
        AND a.aviso_enviado_en IS NULL
        -- La hora de cierre se calcula sobre el dia del propio fichaje, no sobre
        -- hoy, para que tambien salten las jornadas que quedaron abiertas dias
        -- atras y no solo la de esta tarde.
        AND (((a.clock_in AT TIME ZONE _org.time_zone)::date::text || ' ' ||
              _org.attendance_end::text)::timestamp AT TIME ZONE _org.time_zone) <= _instante
    LOOP
      _dia := _pend.dia_local;

      _mensaje := 'Tienes la jornada del ' || to_char(_dia, 'DD/MM/YYYY') ||
                  ' sin cerrar. Registra la hora real de salida.';

      INSERT INTO public.notifications (user_id, organization_id, type, message)
      VALUES (_pend.user_id, _org.id, 'jornada_sin_cerrar', _mensaje);

      -- La direccion se entera tambien: si la persona no lo corrige, alguien
      -- tiene que hacerlo, y con un motivo escrito.
      INSERT INTO public.notifications (user_id, organization_id, type, message)
      SELECT ur.user_id, _org.id, 'jornada_sin_cerrar_admin',
             'Jornada sin cerrar del ' || to_char(_dia, 'DD/MM/YYYY') ||
             ' pendiente de revision.'
      FROM public.user_roles ur
      WHERE ur.organization_id = _org.id
        AND ur.role = 'admin';

      UPDATE public.attendance_logs
      SET aviso_enviado_en = _instante
      WHERE id = _pend.id;

      _total := _total + 1;
    END LOOP;
  END LOOP;

  RETURN _total;
END;
$function$;

COMMENT ON FUNCTION public.cron_avisar_jornadas_abiertas(timestamptz) IS
  'Avisa de jornadas sin cerrar. No las cierra: inventar la hora de salida es '
  'exactamente lo que esta migracion viene a eliminar.';

-- 4. Traza de todo lo que le pasa a un fichaje.
--
-- Se reutiliza `audit_log`, que ya tiene pantalla de consulta con filtros y
-- exportacion a CSV. Escribe el trigger, no la aplicacion, asi que no hay forma
-- de tocar un fichaje por ninguna via sin dejar rastro.
CREATE OR REPLACE FUNCTION public.audit_attendance_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org uuid;
BEGIN
  _org := COALESCE(NEW.organization_id, OLD.organization_id);

  -- `audit_log.organization_id` es NOT NULL. Un fichaje sin taller no deberia
  -- existir, pero si existiera no se puede perder su rastro por eso.
  IF _org IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (organization_id, user_id, action, entity_type, entity_id, details)
    VALUES (_org, auth.uid(), 'jornada_creada', 'attendance_log', NEW.id,
      jsonb_build_object(
        'trabajador', NEW.user_id,
        'entrada',    NEW.clock_in,
        'salida',     NEW.clock_out,
        'origen',     NEW.origen));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Solo interesa lo que cambia la jornada registrada. Marcar el aviso como
    -- enviado no es un cambio del registro y llenaria la traza de ruido.
    IF OLD.clock_in      IS DISTINCT FROM NEW.clock_in
    OR OLD.clock_out     IS DISTINCT FROM NEW.clock_out
    OR OLD.total_minutes IS DISTINCT FROM NEW.total_minutes
    OR OLD.exit_type     IS DISTINCT FROM NEW.exit_type
    OR OLD.origen        IS DISTINCT FROM NEW.origen THEN
      INSERT INTO public.audit_log (organization_id, user_id, action, entity_type, entity_id, details)
      VALUES (_org, auth.uid(), 'jornada_modificada', 'attendance_log', NEW.id,
        jsonb_build_object(
          'trabajador',     NEW.user_id,
          'entrada_antes',  OLD.clock_in,  'entrada_despues',  NEW.clock_in,
          'salida_antes',   OLD.clock_out, 'salida_despues',   NEW.clock_out,
          'minutos_antes',  OLD.total_minutes, 'minutos_despues', NEW.total_minutes,
          'origen',         NEW.origen,
          'motivo',         NEW.motivo));
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (organization_id, user_id, action, entity_type, entity_id, details)
    VALUES (_org, auth.uid(), 'jornada_eliminada', 'attendance_log', OLD.id,
      jsonb_build_object(
        'trabajador', OLD.user_id,
        'entrada',    OLD.clock_in,
        'salida',     OLD.clock_out,
        'minutos',    OLD.total_minutes));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_audit_attendance ON public.attendance_logs;
CREATE TRIGGER trg_audit_attendance
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_attendance_changes();

-- 5. Que no se pueda borrar ni reescribir a la ligera.
--
-- El borrado ya estaba cerrado por RLS al no haber politica de DELETE, pero eso
-- solo protege al usuario de la aplicacion: cualquier funcion SECURITY DEFINER
-- se lo salta. El trigger lo cierra tambien por dentro. La purga legitima abre
-- la puerta con una marca de transaccion.
CREATE OR REPLACE FUNCTION public.proteger_registro_jornada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF COALESCE(current_setting('app.purga_jornada', true), '') <> 'on' THEN
      RAISE EXCEPTION 'Los registros de jornada no se borran (conservacion obligatoria de 4 anos). Corrigelos con motivo.'
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- La hora de entrada es el dato que da valor al registro. Cerrar una jornada
  -- abierta es normal; mover hacia atras la hora a la que alguien llego, no.
  IF OLD.clock_in IS DISTINCT FROM NEW.clock_in
     AND COALESCE(current_setting('app.correccion_jornada', true), '') <> 'on' THEN
    RAISE EXCEPTION 'La hora de entrada solo se cambia mediante una correccion con motivo.'
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_proteger_jornada ON public.attendance_logs;
CREATE TRIGGER trg_proteger_jornada
  BEFORE UPDATE OR DELETE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.proteger_registro_jornada();

REVOKE DELETE ON public.attendance_logs FROM authenticated;

-- La politica de UPDATE dejaba a cualquiera reescribir sus propias jornadas ya
-- cerradas. Se limita a cerrar la que tiene abierta.
DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance_logs;
CREATE POLICY "Cerrar la jornada abierta propia"
  ON public.attendance_logs FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND auth.uid() = user_id
    AND clock_out IS NULL
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND auth.uid() = user_id
  );

-- 6. Correccion con motivo obligatorio.
--
-- Sin esto no hay forma de arreglar un olvido: quien no ficha un martes se queda
-- con ese martes mal para siempre. Un registro que no se puede corregir acaba
-- llevandose en un cuaderno aparte, que es peor que no tenerlo.
CREATE OR REPLACE FUNCTION public.corregir_jornada(
  _id        uuid,
  _clock_in  timestamptz,
  _clock_out timestamptz,
  _motivo    text
)
RETURNS public.attendance_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _fila public.attendance_logs;
BEGIN
  IF _motivo IS NULL OR length(btrim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'El motivo de la correccion es obligatorio.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO _fila FROM public.attendance_logs WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de jornada no encontrado.' USING ERRCODE = 'no_data_found';
  END IF;

  -- Solo la direccion del propio taller. `is_org_admin()` no vale aqui porque
  -- comprueba el taller de quien llama, no el del registro que se corrige.
  IF NOT (public.has_role(auth.uid(), 'admin')
          AND _fila.organization_id = public.get_user_organization_id()) THEN
    RAISE EXCEPTION 'Solo la direccion del taller puede corregir jornadas.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF _clock_out IS NOT NULL AND _clock_out <= _clock_in THEN
    RAISE EXCEPTION 'La salida no puede ser anterior o igual a la entrada.'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM set_config('app.correccion_jornada', 'on', true);

  UPDATE public.attendance_logs
  SET clock_in      = _clock_in,
      clock_out     = _clock_out,
      total_minutes = CASE
                        WHEN _clock_out IS NULL THEN NULL
                        ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_clock_out - _clock_in)) / 60))::int
                      END,
      origen        = 'correccion',
      motivo        = btrim(_motivo),
      corregido_por = auth.uid(),
      corregido_en  = now()
  WHERE id = _id
  RETURNING * INTO _fila;

  PERFORM set_config('app.correccion_jornada', 'off', true);

  RETURN _fila;
END;
$function$;

-- 7. Conservacion de cuatro anos.
--
-- Nada mas borra jornadas: `archive_old_delivered_vehicles` solo toca vehiculos,
-- y el trigger de arriba cierra cualquier otra via. Esta es la unica puerta, y
-- solo se abre para lo que ya cumplio el plazo.
CREATE OR REPLACE FUNCTION public.purgar_jornadas_caducadas(_instante timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _n integer;
BEGIN
  PERFORM set_config('app.purga_jornada', 'on', true);

  WITH purgadas AS (
    DELETE FROM public.attendance_logs
    WHERE clock_in < (_instante - interval '4 years')
    RETURNING 1
  )
  SELECT count(*) INTO _n FROM purgadas;

  PERFORM set_config('app.purga_jornada', 'off', true);

  RETURN _n;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cron_avisar_jornadas_abiertas(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purgar_jornadas_caducadas(timestamptz)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_attendance_changes()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.proteger_registro_jornada()                FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cron_avisar_jornadas_abiertas(timestamptz) TO postgres;
GRANT  EXECUTE ON FUNCTION public.purgar_jornadas_caducadas(timestamptz)     TO postgres;

REVOKE EXECUTE ON FUNCTION public.corregir_jornada(uuid, timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.corregir_jornada(uuid, timestamptz, timestamptz, text) TO authenticated;

-- 8. Programacion.
DO $$
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'pg_cron no disponible: se omite la reprogramacion.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'asistencia-cierre') THEN
    PERFORM cron.unschedule('asistencia-cierre');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'jornadas-sin-cerrar') THEN
    PERFORM cron.unschedule('jornadas-sin-cerrar');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'jornadas-purga') THEN
    PERFORM cron.unschedule('jornadas-purga');
  END IF;

  PERFORM cron.schedule('jornadas-sin-cerrar', '*/15 * * * *',
                        'SELECT public.cron_avisar_jornadas_abiertas();');

  -- La purga no corre prisa: lo que sobra por antiguedad puede esperar al dia 1.
  PERFORM cron.schedule('jornadas-purga', '30 3 1 * *',
                        'SELECT public.purgar_jornadas_caducadas();');
END $$;
