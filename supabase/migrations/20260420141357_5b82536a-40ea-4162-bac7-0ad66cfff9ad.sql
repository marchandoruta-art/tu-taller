DROP FUNCTION IF EXISTS public.get_workshop_contact_settings();

CREATE FUNCTION public.get_workshop_contact_settings()
RETURNS TABLE (
  nombre_taller text,
  horario text,
  telefono text,
  whatsapp text,
  whatsapp_message text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
BEGIN
  _org_id := public.get_user_organization_id();

  IF auth.uid() IS NULL OR _org_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(o.name, 'Taller') AS nombre_taller,
    COALESCE(MAX(CASE WHEN s.key = 'taller_horario' THEN s.value END), 'Lunes a viernes: 8:00 – 16:00 h') AS horario,
    COALESCE(MAX(CASE WHEN s.key = 'taller_telefono' THEN s.value END), '971 322 883') AS telefono,
    COALESCE(MAX(CASE WHEN s.key = 'taller_whatsapp' THEN s.value END), '689 907 343') AS whatsapp,
    COALESCE(MAX(CASE WHEN s.key = 'whatsapp_message' THEN s.value END), '') AS whatsapp_message
  FROM public.organizations o
  LEFT JOIN public.app_settings s
    ON s.organization_id = o.id
   AND s.key IN ('taller_horario', 'taller_telefono', 'taller_whatsapp', 'whatsapp_message')
  WHERE o.id = _org_id
  GROUP BY o.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workshop_contact_settings() TO authenticated;