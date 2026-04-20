DO $$
DECLARE
  _org_id uuid;
BEGIN
  FOR _org_id IN
    SELECT o.id
    FROM public.organizations o
  LOOP
    INSERT INTO public.app_settings (key, value, organization_id)
    SELECT s.key, s.value, _org_id
    FROM public.app_settings s
    WHERE s.organization_id IS NULL
      AND s.key IN ('taller_telefono', 'taller_whatsapp', 'taller_horario', 'whatsapp_message')
      AND NOT EXISTS (
        SELECT 1
        FROM public.app_settings existing
        WHERE existing.organization_id = _org_id
          AND existing.key = s.key
      );
  END LOOP;
END $$;