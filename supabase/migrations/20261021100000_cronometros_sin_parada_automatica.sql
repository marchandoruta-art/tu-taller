-- Los cronometros de vehiculo dejan de pararse solos.
--
-- Habia un proceso que, de lunes a viernes a partir de las 17:15, cerraba todos
-- los cronometros abiertos. Esa hora la elegi yo por defecto en agosto sin
-- preguntar a que hora cierra el taller, y el resultado se ve en los datos:
-- trece cronometros parados clavados a las 17:15, con 226 minutos de media.
-- No eran olvidos de madrugada: era gente trabajando a la que se le cortaba el
-- reloj a media tarde.
--
-- El fondo del asunto es el mismo que el de las jornadas fabricadas que se
-- retiraron en agosto: el sistema escribia una hora de fin que nadie habia
-- marcado. Y aqui tiene una consecuencia directa, porque ese tiempo alimenta
-- la pantalla de productividad.
--
-- A partir de ahora lo empieza y lo termina la persona. Si se olvida, el
-- cronometro sigue corriendo y se corrige a mano: mejor un dato visiblemente
-- raro que uno falso con buena pinta.

-- ---------------------------------------------------------------------------
-- 1. Fuera la tarea y la funcion.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL
     AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cronometros-parada') THEN
    PERFORM cron.unschedule('cronometros-parada');
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.auto_stop_vehicle_timers(timestamptz);
DROP FUNCTION IF EXISTS public.auto_stop_vehicle_timers();

ALTER TABLE public.organizations DROP COLUMN IF EXISTS vehicle_timer_cutoff;

-- ---------------------------------------------------------------------------
-- 2. Los festivos pasan a servir para algo que si tiene sentido: que el
--    formulario publico no ofrezca cita los dias que el taller esta cerrado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cita_publica_huecos(
  _slug  text,
  _desde date DEFAULT CURRENT_DATE,
  _dias  integer DEFAULT 14
)
RETURNS TABLE (dia date, hora time, libres integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org public.organizations;
BEGIN
  SELECT * INTO _org FROM public.organizations
   WHERE slug = btrim(_slug) AND citas_web_activas AND dado_de_baja_en IS NULL;
  IF _org.id IS NULL THEN RETURN; END IF;

  _dias := least(greatest(coalesce(_dias, 14), 1), 60);

  RETURN QUERY
  WITH dias AS (
    SELECT d::date AS dia
    FROM generate_series(_desde, _desde + (_dias - 1), interval '1 day') AS d
    WHERE extract(isodow FROM d)::smallint = ANY (_org.citas_dias)
      -- Los dias que el taller tiene marcados como festivo no se ofrecen.
      AND NOT EXISTS (
        SELECT 1 FROM public.organization_holidays h
         WHERE h.organization_id = _org.id AND h.date = d::date
      )
  ),
  franjas AS (
    SELECT dias.dia, h::time AS hora
    FROM dias,
         generate_series(
           dias.dia + _org.citas_desde,
           dias.dia + _org.citas_hasta - make_interval(mins => _org.citas_duracion_min),
           make_interval(mins => _org.citas_duracion_min)
         ) AS h
  )
  -- Se cuenta todo lo que cae dentro de la franja, no solo lo que coincide al
  -- minuto: el taller sigue cogiendo citas por telefono a cualquier hora.
  SELECT f.dia,
         f.hora,
         (_org.citas_por_franja - count(a.id))::integer
  FROM franjas f
  LEFT JOIN public.appointments a
         ON a.organization_id  = _org.id
        AND a.appointment_date = f.dia
        AND a.appointment_time >= f.hora
        AND a.appointment_time <  (f.hora + make_interval(mins => _org.citas_duracion_min))
        AND a.confirmation_status <> 'cancelada'
  GROUP BY f.dia, f.hora
  HAVING (_org.citas_por_franja - count(a.id)) > 0
  ORDER BY f.dia, f.hora;
END $$;

REVOKE ALL ON FUNCTION public.cita_publica_huecos(text, date, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.cita_publica_huecos(text, date, integer) TO anon, authenticated;
