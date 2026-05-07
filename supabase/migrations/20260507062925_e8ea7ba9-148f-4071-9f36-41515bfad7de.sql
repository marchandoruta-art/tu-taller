CREATE OR REPLACE FUNCTION public.convert_today_appointments()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _user_id uuid;
  _apt record;
  _owner_id uuid;
  _vehicle_id uuid;
  _plate text;
  _brand text;
  _model text;
  _client_name text;
  _client_phone text;
  _tasks jsonb;
  _created integer := 0;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN 0;
  END IF;

  _org_id := public.get_user_organization_id(_user_id);
  IF _org_id IS NULL THEN
    RETURN 0;
  END IF;

  FOR _apt IN
    SELECT *
    FROM public.appointments
    WHERE organization_id = _org_id
      AND appointment_date = CURRENT_DATE
      AND vehicle_id IS NULL
  LOOP
    -- Sanitize fields, use fallbacks instead of skipping
    _plate := NULLIF(NULLIF(TRIM(COALESCE(_apt.vehicle_plate, '')), ''), '-');
    _brand := NULLIF(NULLIF(TRIM(COALESCE(_apt.vehicle_brand, '')), ''), '-');
    _model := NULLIF(NULLIF(TRIM(COALESCE(_apt.vehicle_model, '')), ''), '-');
    _client_name := NULLIF(TRIM(COALESCE(_apt.client_name, '')), '');
    _client_phone := NULLIF(NULLIF(TRIM(COALESCE(_apt.client_phone, '')), ''), '-');

    -- Use fallbacks so the appointment always converts
    IF _plate IS NULL THEN _plate := 'SIN-MATRICULA'; END IF;
    IF _brand IS NULL THEN _brand := 'Sin especificar'; END IF;
    IF _model IS NULL THEN _model := 'Sin especificar'; END IF;

    _owner_id := NULL;
    IF _client_name IS NOT NULL THEN
      INSERT INTO public.owners (name, phone, organization_id)
      VALUES (_client_name, _client_phone, _org_id)
      RETURNING id INTO _owner_id;
    END IF;

    -- Build client_tasks from issue_description
    IF _apt.issue_description IS NOT NULL AND length(trim(_apt.issue_description)) > 0 THEN
      SELECT COALESCE(jsonb_agg(jsonb_build_object('text', t, 'done', false)), '[]'::jsonb)
      INTO _tasks
      FROM (
        SELECT trim(unnest(string_to_array(regexp_replace(_apt.issue_description, '[;,]', E'\n', 'g'), E'\n'))) AS t
      ) sub
      WHERE length(t) > 0;
    ELSE
      _tasks := '[]'::jsonb;
    END IF;

    INSERT INTO public.vehicles (
      plate, brand, model, client_description, client_tasks,
      owner_id, assigned_to, created_by, organization_id, status
    )
    VALUES (
      UPPER(_plate), _brand, _model, _apt.issue_description, _tasks,
      _owner_id, _apt.assigned_to, COALESCE(_apt.created_by, _user_id), _org_id, 'recibido'
    )
    RETURNING id INTO _vehicle_id;

    UPDATE public.appointments
    SET vehicle_id = _vehicle_id
    WHERE id = _apt.id;

    _created := _created + 1;
  END LOOP;

  RETURN _created;
END;
$function$;