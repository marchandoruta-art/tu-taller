\set ON_ERROR_STOP off
SET client_min_messages TO NOTICE;
BEGIN;
CREATE OR REPLACE FUNCTION pg_temp.c(_n text,_ok boolean,_d text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  RAISE NOTICE '%  %  %', CASE WHEN _ok THEN 'OK    ' ELSE 'FALLA ' END, rpad(_n,56), _d; END $$;

-- Precios de Stripe de mentira, como los pondria Isra.
UPDATE public.planes SET stripe_precio_mensual='price_pro_mes', stripe_precio_anual='price_pro_anio'
 WHERE codigo='profesional';
UPDATE public.planes SET stripe_precio_mensual='price_com_mes', stripe_precio_anual='price_com_anio'
 WHERE codigo='completo';

DO $$
DECLARE
  _org uuid := '11111111-aaaa-0000-0000-000000000001';
  _due uuid := '11111111-aaaa-0000-0000-000000000002';
BEGIN
  INSERT INTO auth.users (id,email) VALUES (_due,'pago@p.local');
  INSERT INTO public.organizations (id,name,slug,owner_id,stripe_cliente_id)
  VALUES (_org,'Taller Pago','taller-pago',_due,'cus_PRUEBA');
  INSERT INTO public.profiles (user_id,organization_id,full_name) VALUES (_due,_org,'D')
  ON CONFLICT (user_id) DO UPDATE SET organization_id=_org;
  DELETE FROM public.user_roles WHERE user_id=_due;
  INSERT INTO public.user_roles (user_id,organization_id,role) VALUES (_due,_org,'admin');
END $$;

DO $$
DECLARE
  _org uuid := '11111111-aaaa-0000-0000-000000000001';
  _o public.organizations;
  _falla boolean := false;
BEGIN
  PERFORM pg_temp.c('arranca en prueba, como cualquier taller nuevo',
    (SELECT estado_suscripcion FROM public.organizations WHERE id=_org) = 'prueba');

  -- Paga el plan profesional mensual.
  PERFORM public.aplicar_pago_stripe('cus_PRUEBA','sub_1','active','price_pro_mes',
                                      now() + interval '30 days');
  SELECT * INTO _o FROM public.organizations WHERE id=_org;
  PERFORM pg_temp.c('el pago lo deja activo', _o.estado_suscripcion = 'activa', _o.estado_suscripcion::text);
  PERFORM pg_temp.c('y le pone el plan que compro', _o.plan = 'profesional', _o.plan);
  PERFORM pg_temp.c('reconoce que es mensual', _o.intervalo_pago = 'mensual', _o.intervalo_pago);
  PERFORM pg_temp.c('guarda la suscripcion de Stripe', _o.stripe_suscripcion_id = 'sub_1');
  PERFORM pg_temp.c('tiene acceso', public.taller_tiene_acceso(_org));
  PERFORM pg_temp.c('y ya puede usar el registro de jornada',
    public.taller_puede('registro_jornada', _org));
  PERFORM pg_temp.c('avisa a la direccion',
    EXISTS (SELECT 1 FROM public.notifications
             WHERE organization_id=_org AND type='suscripcion'));

  -- Sube al completo, anual.
  PERFORM public.aplicar_pago_stripe('cus_PRUEBA','sub_1','active','price_com_anio',
                                      now() + interval '365 days');
  SELECT * INTO _o FROM public.organizations WHERE id=_org;
  PERFORM pg_temp.c('al subir de plan, pasa a completo', _o.plan = 'completo', _o.plan);
  PERFORM pg_temp.c('y reconoce que ahora es anual', _o.intervalo_pago = 'anual', _o.intervalo_pago);
  PERFORM pg_temp.c('ya puede usar las citas web', public.taller_puede('citas_web', _org));

  -- Le falla la tarjeta.
  PERFORM public.aplicar_pago_stripe('cus_PRUEBA','sub_1','past_due',NULL,NULL);
  SELECT * INTO _o FROM public.organizations WHERE id=_org;
  PERFORM pg_temp.c('tarjeta rechazada: queda como pago pendiente',
    _o.estado_suscripcion = 'pago_pendiente', _o.estado_suscripcion::text);
  PERFORM pg_temp.c('pero NO pierde el plan que tenia', _o.plan = 'completo', _o.plan);
  PERFORM pg_temp.c('y sigue entrando: aun le queda la cortesia',
    public.taller_tiene_acceso(_org));

  -- Se da de baja.
  PERFORM public.aplicar_pago_stripe('cus_PRUEBA','sub_1','canceled',NULL,NULL);
  SELECT * INTO _o FROM public.organizations WHERE id=_org;
  PERFORM pg_temp.c('al cancelar, queda de baja', _o.estado_suscripcion = 'cancelada');
  PERFORM pg_temp.c('y pierde el acceso', NOT public.taller_tiene_acceso(_org));

  -- Vuelve.
  PERFORM public.aplicar_pago_stripe('cus_PRUEBA','sub_2','active','price_pro_mes',
                                      now() + interval '30 days');
  SELECT * INTO _o FROM public.organizations WHERE id=_org;
  PERFORM pg_temp.c('si vuelve, se le levanta la baja', _o.dado_de_baja_en IS NULL);
  PERFORM pg_temp.c('y recupera el acceso', public.taller_tiene_acceso(_org));

  -- Un cliente de Stripe que no es de nadie.
  BEGIN
    PERFORM public.aplicar_pago_stripe('cus_INVENTADO','sub_x','active','price_pro_mes',now());
  EXCEPTION WHEN OTHERS THEN _falla := true; END;
  PERFORM pg_temp.c('un cliente desconocido da error, no toca nada', _falla);
END $$;

-- Nadie puede llamar a la funcion del webhook desde la aplicacion.
DO $$
BEGIN
  PERFORM pg_temp.c('aplicar_pago_stripe esta cerrada a la aplicacion',
    NOT has_function_privilege('authenticated',
      'public.aplicar_pago_stripe(text,text,text,text,timestamptz)', 'EXECUTE'));
  PERFORM pg_temp.c('y tambien al rol publico',
    NOT has_function_privilege('anon',
      'public.aplicar_pago_stripe(text,text,text,text,timestamptz)', 'EXECUTE'));
END $$;
ROLLBACK;
