-- Cobro por Stripe.
--
-- Los identificadores de precio de Stripe van en la tabla `planes`, no en
-- variables de entorno. En el prototipo de julio eran seis variables, y eso
-- significa que cambiar un precio obliga a redesplegar las funciones. Aqui es
-- una consulta, igual que el resto de limites.
--
-- El webhook es la unica fuente de verdad sobre el estado de pago: la pantalla
-- nunca marca a nadie como pagado. Si el navegador pudiera decir "ya he
-- pagado", cualquiera podria decirlo.

-- ---------------------------------------------------------------------------
-- 1. Donde se guardan los precios de Stripe.
-- ---------------------------------------------------------------------------
ALTER TABLE public.planes
  ADD COLUMN IF NOT EXISTS stripe_precio_mensual text,
  ADD COLUMN IF NOT EXISTS stripe_precio_anual   text,
  ADD COLUMN IF NOT EXISTS precio_anual          numeric(7,2);

COMMENT ON COLUMN public.planes.stripe_precio_mensual IS
  'El price_xxx de Stripe. Cambiar de precio es actualizar esto, no redesplegar.';

-- Dos meses de regalo al pagar el ano entero.
UPDATE public.planes SET precio_anual = round(precio_mensual * 10, 2)
WHERE precio_mensual > 0 AND precio_anual IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Lo que Stripe devuelve de cada taller.
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_cliente_id      text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_suscripcion_id  text,
  ADD COLUMN IF NOT EXISTS intervalo_pago         text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_intervalo_valido') THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_intervalo_valido
      CHECK (intervalo_pago IS NULL OR intervalo_pago IN ('mensual','anual'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_sub
  ON public.organizations (stripe_suscripcion_id);

-- ---------------------------------------------------------------------------
-- 3. Lo que escribe el webhook. Unico sitio donde cambia el estado de pago.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aplicar_pago_stripe(
  _cliente       text,
  _suscripcion   text,
  _estado_stripe text,
  _precio        text DEFAULT NULL,
  _vence_en      timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org       uuid;
  _plan      text;
  _intervalo text;
  _estado    public.estado_suscripcion;
BEGIN
  SELECT id INTO _org FROM public.organizations WHERE stripe_cliente_id = _cliente;
  IF _org IS NULL THEN
    RAISE EXCEPTION 'No hay ningun taller con el cliente de Stripe %', _cliente;
  END IF;

  -- Que plan ha comprado, mirando el precio contra la tabla.
  IF _precio IS NOT NULL THEN
    SELECT codigo,
           CASE WHEN stripe_precio_anual = _precio THEN 'anual' ELSE 'mensual' END
      INTO _plan, _intervalo
      FROM public.planes
     WHERE stripe_precio_mensual = _precio OR stripe_precio_anual = _precio;
  END IF;

  -- Traduccion de los estados de Stripe a los nuestros.
  _estado := CASE _estado_stripe
    WHEN 'active'   THEN 'activa'
    WHEN 'trialing' THEN 'prueba'
    WHEN 'past_due' THEN 'pago_pendiente'
    WHEN 'unpaid'   THEN 'pago_pendiente'
    WHEN 'canceled' THEN 'cancelada'
    ELSE 'pago_pendiente'
  END::public.estado_suscripcion;

  UPDATE public.organizations
     SET stripe_suscripcion_id  = coalesce(_suscripcion, stripe_suscripcion_id),
         estado_suscripcion     = _estado,
         plan                   = coalesce(_plan, plan),
         intervalo_pago         = coalesce(_intervalo, intervalo_pago),
         suscripcion_termina_en = coalesce(_vence_en, suscripcion_termina_en),
         -- Al volver a estar al corriente se levanta la baja.
         dado_de_baja_en        = CASE WHEN _estado = 'cancelada' THEN now() ELSE NULL END,
         updated_at             = now()
   WHERE id = _org;

  -- Que la direccion del taller se entere.
  INSERT INTO public.notifications (organization_id, user_id, type, message)
  SELECT _org, ur.user_id, 'suscripcion',
         CASE _estado
           WHEN 'activa'         THEN 'Pago recibido. La suscripción está al día.'
           WHEN 'pago_pendiente' THEN 'No hemos podido cobrar la suscripción. Revisa la tarjeta.'
           WHEN 'cancelada'      THEN 'La suscripción se ha cancelado.'
           ELSE 'La suscripción ha cambiado de estado.'
         END
  FROM public.user_roles ur
  WHERE ur.organization_id = _org AND ur.role IN ('admin','oficina');

  RETURN _org;
END $$;

REVOKE ALL ON FUNCTION public.aplicar_pago_stripe(text,text,text,text,timestamptz)
  FROM public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Lo que la pantalla necesita para pintar los planes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.planes_para_contratar()
RETURNS TABLE (
  codigo         text,
  nombre         text,
  precio_mensual numeric,
  precio_anual   numeric,
  orden          smallint,
  se_puede_pagar boolean,
  es_el_mio      boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.codigo, p.nombre, p.precio_mensual, p.precio_anual, p.orden,
         (p.stripe_precio_mensual IS NOT NULL),
         (p.codigo = (SELECT o.plan FROM public.organizations o
                       JOIN public.profiles pr ON pr.organization_id = o.id
                      WHERE pr.user_id = auth.uid() LIMIT 1))
  FROM public.planes p
  ORDER BY p.orden;
$$;

REVOKE ALL ON FUNCTION public.planes_para_contratar() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.planes_para_contratar() TO authenticated;
