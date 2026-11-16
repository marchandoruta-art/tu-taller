// Lo que Stripe nos cuenta sobre los pagos.
//
// Esta funcion es la UNICA que marca a un taller como pagado. La pantalla no
// lo hace nunca: si el navegador pudiera decir "ya he pagado", cualquiera
// podria decirlo.
//
// La firma se comprueba siempre. Sin eso, cualquiera podria enviarnos un aviso
// falso y regalarse una suscripcion.

import Stripe from 'https://esm.sh/stripe@16.12.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const firma = req.headers.get('stripe-signature');
  const cuerpo = await req.text();

  let evento: Stripe.Event;
  try {
    evento = await stripe.webhooks.constructEventAsync(
      cuerpo, firma!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (e) {
    console.error('Firma no válida:', (e as Error).message);
    return new Response('Firma no válida', { status: 400 });
  }

  const aplicar = async (
    cliente: string, suscripcion: string | null,
    estado: string, precio: string | null, venceEn: number | null,
  ) => {
    const { error } = await supabase.rpc('aplicar_pago_stripe', {
      _cliente: cliente,
      _suscripcion: suscripcion,
      _estado_stripe: estado,
      _precio: precio,
      _vence_en: venceEn ? new Date(venceEn * 1000).toISOString() : null,
    });
    if (error) console.error('aplicar_pago_stripe:', error.message);
  };

  try {
    switch (evento.type) {
      case 'checkout.session.completed': {
        const s = evento.data.object as Stripe.Checkout.Session;
        if (!s.subscription) break;
        const sub = await stripe.subscriptions.retrieve(s.subscription as string);
        await aplicar(
          s.customer as string, sub.id, sub.status,
          sub.items.data[0]?.price?.id ?? null,
          sub.current_period_end,
        );
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = evento.data.object as Stripe.Subscription;
        await aplicar(
          sub.customer as string, sub.id,
          evento.type === 'customer.subscription.deleted' ? 'canceled' : sub.status,
          sub.items.data[0]?.price?.id ?? null,
          sub.current_period_end,
        );
        break;
      }

      // Una renovacion cobrada mueve la fecha de vencimiento.
      case 'invoice.payment_succeeded': {
        const f = evento.data.object as Stripe.Invoice;
        if (!f.subscription) break;
        const sub = await stripe.subscriptions.retrieve(f.subscription as string);
        await aplicar(
          f.customer as string, sub.id, sub.status,
          sub.items.data[0]?.price?.id ?? null,
          sub.current_period_end,
        );
        break;
      }

      case 'invoice.payment_failed': {
        const f = evento.data.object as Stripe.Invoice;
        await aplicar(f.customer as string, (f.subscription as string) ?? null,
                      'past_due', null, null);
        break;
      }

      default:
        // El resto de avisos no nos afectan.
        break;
    }
  } catch (e) {
    console.error(`Fallo procesando ${evento.type}:`, e);
    // 500 para que Stripe lo reintente.
    return new Response('Error', { status: 500 });
  }

  return new Response(JSON.stringify({ recibido: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
