// Abre el portal de Stripe para que el taller cambie de tarjeta, vea sus
// facturas o se de de baja por su cuenta.
//
// Que puedan darse de baja solos no es un descuido: una baja que obliga a
// llamar por telefono genera reclamaciones y mala fama, y la ley de consumo
// exige que cancelar sea tan facil como contratar.

import Stripe from 'https://esm.sh/stripe@16.12.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cabeceras = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (c: unknown, e = 200) =>
  new Response(JSON.stringify(c), { status: e, headers: { ...cabeceras, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cabeceras });

  try {
    const autorizacion = req.headers.get('Authorization');
    if (!autorizacion) return json({ error: 'Hay que iniciar sesión.' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: sesion } = await supabase.auth.getUser(autorizacion.replace('Bearer ', ''));
    const usuario = sesion?.user;
    if (!usuario) return json({ error: 'Sesión no válida.' }, 401);

    const { data: rol } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', usuario.id)
      .in('role', ['admin', 'oficina'])
      .maybeSingle();
    if (!rol?.organization_id) {
      return json({ error: 'Solo la dirección del taller puede gestionar la suscripción.' }, 403);
    }

    const { data: taller } = await supabase
      .from('organizations').select('stripe_cliente_id')
      .eq('id', rol.organization_id).single();

    if (!taller?.stripe_cliente_id) {
      return json({ error: 'Este taller todavía no tiene ninguna suscripción.' }, 400);
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
    const base = Deno.env.get('APP_URL') ?? 'https://controlboxapp.com';
    const portal = await stripe.billingPortal.sessions.create({
      customer: taller.stripe_cliente_id,
      return_url: `${base}/planes`,
      locale: 'es',
    });

    return json({ url: portal.url });
  } catch (e) {
    console.error('pago-portal:', e);
    return json({ error: (e as Error).message }, 500);
  }
});
