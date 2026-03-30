import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyClientRequest {
  vehicleId: string;
  notificationType: 'completed' | 'ready_pickup';
}

const escapeHtml = (str: string): string =>
  str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2. Parse and validate request body
    const { vehicleId, notificationType }: NotifyClientRequest = await req.json();

    if (!vehicleId || !notificationType) {
      return new Response(JSON.stringify({ error: 'vehicleId and notificationType are required' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!['completed', 'ready_pickup'].includes(notificationType)) {
      return new Response(JSON.stringify({ error: 'Invalid notificationType' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 3. Fetch vehicle with owner data — RLS ensures org-scoped access
    const { data: vehicle, error: vehicleError } = await supabaseClient
      .from('vehicles')
      .select('id, plate, brand, model, owner_id, owners(name, email, phone)')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return new Response(JSON.stringify({ error: 'Vehicle not found or access denied' }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const owner = vehicle.owners as { name: string; email: string | null; phone: string | null } | null;
    if (!owner) {
      return new Response(JSON.stringify({ error: 'Vehicle has no owner assigned' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const ownerName = owner.name;
    const ownerEmail = owner.email;
    const ownerPhone = owner.phone;
    const vehiclePlate = vehicle.plate;
    const vehicleBrand = vehicle.brand;
    const vehicleModel = vehicle.model;

    const results: { email?: string; whatsapp?: string; emailError?: string } = {};

    // 4. Send email with HTML-escaped user data
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey && ownerEmail) {
      try {
        const subject = notificationType === 'completed' 
          ? `Su vehículo ${escapeHtml(vehiclePlate)} está terminado`
          : `Su vehículo ${escapeHtml(vehiclePlate)} está listo para recoger`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333;">Estimado cliente</h1>
            <p style="font-size: 16px; color: #555;">
              ${notificationType === 'completed' 
                ? 'Le informamos que su vehículo ha sido reparado y está listo.'
                : 'Su vehículo está listo para ser recogido en nuestras instalaciones.'}
            </p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px;">Datos del vehículo:</h3>
              <p style="margin: 5px 0;"><strong>Matrícula:</strong> ${escapeHtml(vehiclePlate)}</p>
              <p style="margin: 5px 0;"><strong>Vehículo:</strong> ${escapeHtml(vehicleBrand)} ${escapeHtml(vehicleModel)}</p>
            </div>
            <p style="font-size: 14px; color: #555;">
              Nuestro horario de atención es de <strong>8:00 a 16:00h</strong>.
            </p>
            <p style="font-size: 14px; color: #555;">
              📞 Teléfono: <strong>971 322 883</strong><br/>
              📱 WhatsApp: <strong>689 907 343</strong>
            </p>
            <p style="font-size: 14px; color: #888; margin-top: 20px;">
              Gracias por confiar en nosotros.
            </p>
            <p style="font-size: 14px; color: #333; font-weight: bold;">
              Taller Autos Formentera
            </p>
          </div>
        `;

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Taller <onboarding@resend.dev>",
            to: [ownerEmail],
            subject,
            html,
          }),
        });

        if (emailResponse.ok) {
          console.log("Email sent successfully");
          results.email = "sent";
        } else {
          const errorData = await emailResponse.json();
          console.error("Error sending email:", errorData);
          results.email = "failed";
          results.emailError = "Error sending email";
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        results.email = "failed";
      }
    }

    // 5. Generate WhatsApp link
    if (ownerPhone) {
      const cleanPhone = ownerPhone.replace(/[\s\-\(\)]/g, '');
      const phoneWithCode = cleanPhone.startsWith('+') ? cleanPhone : `+34${cleanPhone}`;
      
      const message = encodeURIComponent(
        `Estimado cliente,\n\nLe informamos de que su vehículo ${vehiclePlate} (${vehicleBrand} ${vehicleModel}) ya se encuentra terminado y disponible para su recogida en nuestras instalaciones.\n\nNuestro horario de atención es de 8:00 a 16:00h.\n\nPara cualquier consulta puede contactarnos:\n📞 971 322 883\n📱 WhatsApp: 689 907 343\n\nQuedamos a su disposición.\n\nAtentamente,\nTaller Autos Formentera`
      );
      
      results.whatsapp = `https://wa.me/${phoneWithCode.replace('+', '')}?text=${message}`;
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Error in notify-client function:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
