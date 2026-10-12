-- Solicitud de cita desde la web, sin cuenta.
--
-- Hasta ahora las citas las creaba el taller y el cliente solo confirmaba. Esto
-- abre el sentido contrario: el cliente pide, el taller acepta.
--
-- AVISO SOBRE `anon`. La migracion 20260815090100 retiro al rol publico el
-- permiso de ejecucion sobre todo, y varios guardas de seguridad se apoyan en
-- eso: dan por hecho que si `auth.uid()` es nulo, quien llama es un proceso
-- interno de confianza. Las tres funciones de abajo SI son accesibles sin
-- cuenta, asi que no usan ninguno de esos guardas ni llaman a
-- get_user_organization_id(): resuelven el taller por su slug y se bastan solas.
-- No conceder `anon` a ninguna otra funcion sin revisar aquella migracion.

-- ---------------------------------------------------------------------------
-- 1. Lo que cada taller configura de sus citas.
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS citas_web_activas  boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS citas_dias         smallint[]  NOT NULL DEFAULT '{1,2,3,4,5}',
  ADD COLUMN IF NOT EXISTS citas_desde        time        NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS citas_hasta        time        NOT NULL DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS citas_duracion_min integer     NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS citas_por_franja   integer     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS citas_servicios    text[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS citas_avisos       text[]      NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.organizations.citas_dias IS
  'Dias de la semana que admiten cita: 1 lunes, 7 domingo. Mismo criterio que isodow.';

-- ---------------------------------------------------------------------------
-- 2. Lo que trae una solicitud web y la cita del taller no tenia.
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS client_email         text,
  ADD COLUMN IF NOT EXISTS documento_tipo       text,
  ADD COLUMN IF NOT EXISTS documento_numero     text,
  ADD COLUMN IF NOT EXISTS vehicle_year         integer,
  ADD COLUMN IF NOT EXISTS servicios            text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS firma                text,
  ADD COLUMN IF NOT EXISTS avisos_aceptados_en  timestamptz,
  ADD COLUMN IF NOT EXISTS origen               text NOT NULL DEFAULT 'taller';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_origen_valido') THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_origen_valido CHECK (origen IN ('taller', 'web'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_org_fecha
  ON public.appointments (organization_id, appointment_date);

-- ---------------------------------------------------------------------------
-- 3. Configuracion publica de un taller. Solo lo que la pagina necesita
--    pintar: ni correos, ni dueno, ni nada mas.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cita_publica_config(_slug text)
RETURNS TABLE (
  nombre        text,
  logo_url      text,
  servicios     text[],
  avisos        text[],
  duracion_min  integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.name, o.logo_url, o.citas_servicios, o.citas_avisos, o.citas_duracion_min
  FROM public.organizations o
  WHERE o.slug = btrim(_slug)
    AND o.citas_web_activas
    AND o.dado_de_baja_en IS NULL
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 4. Huecos libres. Cuenta lo ya reservado y resta.
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

  -- Techo sensato: ni una peticion puede pedir un ano de calendario.
  _dias := least(greatest(coalesce(_dias, 14), 1), 60);

  RETURN QUERY
  WITH dias AS (
    SELECT d::date AS dia
    FROM generate_series(_desde, _desde + (_dias - 1), interval '1 day') AS d
    WHERE extract(isodow FROM d)::smallint = ANY (_org.citas_dias)
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
  -- Se cuenta todo lo que CAE DENTRO de la franja, no solo lo que coincide al
  -- minuto. El taller sigue apuntando citas por telefono a cualquier hora: una
  -- de las 08:15 tiene que ocupar la franja de las 08:00, o acabarian dos
  -- coches a la vez.
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

-- ---------------------------------------------------------------------------
-- 5. Registrar la solicitud.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cita_publica_solicitar(
  _slug       text,
  _nombre     text,
  _apellidos  text,
  _telefono   text,
  _email      text,
  _doc_tipo   text,
  _doc_numero text,
  _marca      text,
  _modelo     text,
  _anio       integer,
  _matricula  text,
  _servicios  text[],
  _detalle    text,
  _dia        date,
  _hora       time,
  _firma      text
)
RETURNS TABLE (id uuid, token uuid, taller text, dia date, hora time)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org    public.organizations;
  _libres integer;
  _nueva  public.appointments;
BEGIN
  SELECT * INTO _org FROM public.organizations
   WHERE slug = btrim(_slug) AND citas_web_activas AND dado_de_baja_en IS NULL;
  IF _org.id IS NULL THEN
    RAISE EXCEPTION 'Este taller no admite citas por internet.';
  END IF;

  IF length(btrim(coalesce(_nombre, ''))) < 2
     OR length(btrim(coalesce(_apellidos, ''))) < 2
     OR length(btrim(coalesce(_telefono, ''))) < 6
     OR length(btrim(coalesce(_matricula, ''))) < 4 THEN
    RAISE EXCEPTION 'Faltan datos obligatorios.';
  END IF;

  IF coalesce(array_length(_servicios, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Elige al menos un servicio.';
  END IF;

  -- La firma tiene que coincidir con el nombre: es lo que la convierte en
  -- prueba de que esa persona acepto los avisos, y no un campo cualquiera.
  IF lower(btrim(coalesce(_firma, ''))) <> lower(btrim(_nombre || ' ' || _apellidos)) THEN
    RAISE EXCEPTION 'La firma debe coincidir con el nombre y los apellidos.';
  END IF;

  IF _dia < CURRENT_DATE THEN
    RAISE EXCEPTION 'Esa fecha ya ha pasado.';
  END IF;

  -- Freno al abuso: la pagina es publica y escribe en la base.
  IF (SELECT count(*) FROM public.appointments
       WHERE organization_id = _org.id
         AND created_at > now() - interval '24 hours'
         AND (client_phone = btrim(_telefono)
              OR (client_email IS NOT NULL AND lower(client_email) = lower(btrim(_email))))) >= 3 THEN
    RAISE EXCEPTION 'Ya hay varias solicitudes con estos datos. Llama al taller.';
  END IF;

  -- Que el hueco siga libre: entre pintar el calendario y pulsar el boton
  -- puede haberlo cogido otro.
  -- Con alias: esta funcion declara una columna de salida llamada `hora`, y sin
  -- cualificar Postgres no sabe si te refieres a esa o a la de los huecos.
  SELECT h.libres INTO _libres
    FROM public.cita_publica_huecos(_slug, _dia, 1) AS h
   WHERE h.hora = _hora;
  IF coalesce(_libres, 0) <= 0 THEN
    RAISE EXCEPTION 'Ese hueco acaba de ocuparse. Elige otro.';
  END IF;

  INSERT INTO public.appointments (
    organization_id, appointment_date, appointment_time,
    client_name, client_phone, client_email,
    documento_tipo, documento_numero,
    vehicle_brand, vehicle_model, vehicle_year, vehicle_plate,
    servicios, issue_description, firma, avisos_aceptados_en, origen,
    confirmation_status
  ) VALUES (
    _org.id, _dia, _hora,
    btrim(_nombre) || ' ' || btrim(_apellidos), btrim(_telefono), nullif(btrim(_email), ''),
    nullif(btrim(_doc_tipo), ''), nullif(btrim(_doc_numero), ''),
    nullif(btrim(_marca), ''), nullif(btrim(_modelo), ''), _anio, upper(btrim(_matricula)),
    _servicios, nullif(btrim(_detalle), ''), btrim(_firma), now(), 'web',
    'pendiente'
  ) RETURNING * INTO _nueva;

  INSERT INTO public.notifications (organization_id, user_id, type, message)
  SELECT _org.id, ur.user_id, 'cita_solicitada',
         'Nueva solicitud de cita: ' || btrim(_nombre) || ' ' || btrim(_apellidos) ||
         ', ' || upper(btrim(_matricula)) || ', el ' ||
         to_char(_dia, 'DD/MM') || ' a las ' || to_char(_hora, 'HH24:MI')
  FROM public.user_roles ur
  WHERE ur.organization_id = _org.id AND ur.role IN ('admin', 'oficina');

  RETURN QUERY SELECT _nueva.id, _nueva.confirmation_token, _org.name, _nueva.appointment_date, _nueva.appointment_time;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Permisos. Estas tres, y solo estas, se abren al rol publico.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.cita_publica_config(text) FROM public;
REVOKE ALL ON FUNCTION public.cita_publica_huecos(text, date, integer) FROM public;
REVOKE ALL ON FUNCTION public.cita_publica_solicitar(text,text,text,text,text,text,text,text,text,integer,text,text[],text,date,time,text) FROM public;

GRANT EXECUTE ON FUNCTION public.cita_publica_config(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cita_publica_huecos(text, date, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cita_publica_solicitar(text,text,text,text,text,text,text,text,text,integer,text,text[],text,date,time,text) TO anon, authenticated;
