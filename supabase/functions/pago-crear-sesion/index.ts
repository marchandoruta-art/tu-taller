// Abre la pagina de pago de Stripe para contratar un plan.
//
// Comprueba antes que quien llama manda de verdad en ese taller: si no, con el
// identificador de otro taller cualquiera podria ponerle una suscripcion.
//
// Los identificadores de precio salen de la tabla `planes`, no de variables de
// entorno, para que cambiar un precio sea una consulta.

import Stripe from 'https://esm.sh/stripe@16.12.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cabeceras = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...cabeceras, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cabeceras });

  try {
    const { plan, intervalo = 'mensual' } = await req.json();
    if (!plan) return json({ error: 'Falta el plan.' }, 400);
    if (!['mensual', 'anual'].includes(intervalo)) {
      return json({ error: 'El intervalo solo puede ser mensual o anual.' }, 400);
    }

    const autorizacion = req.headers.get('Authorization');
    if (!autorizacion) return json({ error: 'Hay que iniciar sesión.' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Quien llama.
    const { data: sesion } = await supabase.auth.getUser(autorizacion.replace('Bearer ', ''));
    const usuario = sesion?.user;
    if (!usuario) return json({ error: 'Sesión no válida.' }, 401);

    // Su taller, y que mande en el.
    const { data: rol } = await supabase
      .from('user_roles')
      .select('organization_id, role')
      .eq('user_id', usuario.id)
      .in('role', ['admin', 'oficina'])
      .maybeSingle();

    if (!rol?.organization_id) {
      return json({ error: 'Solo la dirección del taller puede contratar un plan.' }, 403);
    }

    const { data: taller } = await supabase
      .from('organizations')
      .select('id, name, stripe_cliente_id, email')
      .eq('id', rol.organization_id)
      .single();
    if (!taller) return json({ error: 'No se encuentra el taller.' }, 404);

    // El precio, desde la tabla.
    const columna = intervalo === 'anual' ? 'stripe_precio_anual' : 'stripe_precio_mensual';
    const { data: planFila } = await supabase
      .from('planes')
      .select(`codigo, nombre, ${columna}`)
      .eq('codigo', plan)
      .single();

    const precio = planFila?.[columna as keyof typeof planFila] as string | null;
    if (!precio) {
      return json({ error: `El plan ${plan} todavía no tiene precio configurado en Stripe.` }, 400);
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

    // Un cliente de Stripe por taller, reutilizado siempre.
    let cliente = taller.stripe_cliente_id;
    if (!cliente) {
      const creado = await stripe.customers.create({
        name: taller.name,
        email: taller.email ?? usuario.email,
        metadata: { organization_id: taller.id },
      });
      cliente = creado.id;
      await supabase.from('organizations')
        .update({ stripe_cliente_id: cliente }).eq('id', taller.id);
    }

    const base = Deno.env.get('APP_URL') ?? 'https://controlboxapp.com';
    const sesionPago = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: cliente,
      line_items: [{ price: precio, quantity: 1 }],
      locale: 'es',
      allow_promotion_codes: true,
      success_url: `${base}/planes?pago=hecho`,
      cancel_url: `${base}/planes?pago=cancelado`,
      subscription_data: { metadata: { organization_id: taller.id } },
    });

    return json({ url: sesionPago.url });
  } catch (e) {
    console.error('pago-crear-sesion:', e);
    return json({ error: (e as Error).message }, 500);
  }
});
