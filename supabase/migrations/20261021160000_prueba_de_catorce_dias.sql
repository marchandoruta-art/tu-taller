-- Un taller nuevo entra con catorce dias de prueba del plan completo.
--
-- Hasta ahora, quien creaba un taller desde la pantalla de alta se quedaba con
-- lo que viniera por defecto y sin fecha de nada. Ahora arranca probandolo
-- todo, y cuando se le acaba la prueba no se le echa: baja al plan gratuito y
-- sigue trabajando con sus limites.
--
-- Esa es la diferencia entre perder al cliente y tenerlo dentro esperando a
-- que le apriete el limite. Sus datos no se tocan: si durante la prueba metio
-- veinte coches, se queda con los veinte. Lo que no puede es meter el
-- veintiuno hasta que pague.
--
-- La prueba se asigna con un disparador, no desde la pantalla. Si lo decidiera
-- el navegador, cualquiera podria darse el plan completo para siempre.

-- ---------------------------------------------------------------------------
-- 1. Lo que dura la prueba, en un sitio donde se pueda cambiar sin desplegar.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ajustes_plataforma (
  clave text PRIMARY KEY,
  valor text NOT NULL,
  nota  text
);

ALTER TABLE public.ajustes_plataforma ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ajustes_plataforma FROM anon, authenticated;

INSERT INTO public.ajustes_plataforma (clave, valor, nota) VALUES
  ('dias_de_prueba', '14', 'Dias de prueba del plan completo al crear un taller.'),
  ('plan_de_prueba', 'completo', 'Plan que se prueba. Conviene que sea el mejor.'),
  ('plan_al_acabar', 'gratis', 'Donde cae el taller cuando se acaba la prueba.')
ON CONFLICT (clave) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. El taller nuevo arranca en prueba, lo pida o no.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.arrancar_en_prueba()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dias integer;
  _plan text;
BEGIN
  SELECT valor::int INTO _dias FROM public.ajustes_plataforma WHERE clave = 'dias_de_prueba';
  SELECT valor      INTO _plan FROM public.ajustes_plataforma WHERE clave = 'plan_de_prueba';

  -- Se imponen aqui: lo que mande el navegador da igual.
  NEW.plan                   := coalesce(_plan, 'completo');
  NEW.estado_suscripcion     := 'prueba';
  NEW.prueba_termina_en      := now() + make_interval(days => coalesce(_dias, 14));
  NEW.suscripcion_termina_en := NULL;
  NEW.dado_de_baja_en        := NULL;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_arrancar_en_prueba ON public.organizations;
CREATE TRIGGER trg_arrancar_en_prueba
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.arrancar_en_prueba();

-- ---------------------------------------------------------------------------
-- 3. Al acabarse la prueba, baja al gratuito. No se le echa.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cerrar_pruebas_caducadas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _destino text;
  _n       integer;
BEGIN
  SELECT valor INTO _destino FROM public.ajustes_plataforma WHERE clave = 'plan_al_acabar';

  WITH caducadas AS (
    UPDATE public.organizations
       SET plan               = coalesce(_destino, 'gratis'),
           estado_suscripcion = 'activa',
           updated_at         = now()
     WHERE estado_suscripcion = 'prueba'
       AND prueba_termina_en IS NOT NULL
       AND prueba_termina_en <= now()
       AND dado_de_baja_en IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO _n FROM caducadas;

  -- Se avisa a quien manda en cada taller que acaba de bajar de plan.
  INSERT INTO public.notifications (organization_id, user_id, type, message)
  SELECT o.id, ur.user_id, 'prueba_terminada',
         'Se ha acabado el periodo de prueba. El taller sigue funcionando con el plan gratuito y sus límites.'
  FROM public.organizations o
  JOIN public.user_roles ur ON ur.organization_id = o.id AND ur.role IN ('admin','oficina')
  WHERE o.plan = coalesce(_destino, 'gratis')
    AND o.estado_suscripcion = 'activa'
    AND o.prueba_termina_en BETWEEN now() - interval '1 day' AND now();

  RETURN _n;
END $$;

REVOKE ALL ON FUNCTION public.cerrar_pruebas_caducadas() FROM public, anon, authenticated;

-- Una vez al dia, de madrugada.
DO $$
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'pg_cron no disponible: se omite la programacion.';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pruebas-caducadas') THEN
    PERFORM cron.unschedule('pruebas-caducadas');
  END IF;
  PERFORM cron.schedule('pruebas-caducadas', '15 2 * * *',
                        'SELECT public.cerrar_pruebas_caducadas();');
END $$;
