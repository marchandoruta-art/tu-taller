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

    // Fetch workshop contact settings using service role client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: settingsData } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
      .in('key', ['taller_telefono', 'taller_whatsapp', 'taller_horario']);

    const settings: Record<string, string> = {};
    settingsData?.forEach((s: { key: string; value: string | null }) => {
      if (s.value) settings[s.key] = s.value;
    });

    const tallerTelefono = settings.taller_telefono || '971 322 883';
    const tallerWhatsapp = settings.taller_whatsapp || '689 907 343';
    const tallerHorario = settings.taller_horario || 'Lunes a viernes: 8:00 – 16:00 h';

    // Get org name
    let tallerNombre = 'Taller Autos Formentera';
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    if (profileData?.organization_id) {
      const { data: orgData } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', profileData.organization_id)
        .single();
      if (orgData?.name) tallerNombre = orgData.name;
    }

    const results: { email?: string; whatsapp?: string; emailError?: string } = {};

    // 4. Send email with HTML-escaped user data
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey && ownerEmail) {
      try {
        const subject = notificationType === 'completed' 
          ? `Su vehículo ${escapeHtml(vehiclePlate)} está terminado`
          : `Su vehículo ${escapeHtml(vehiclePlate)} está listo para recoger`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #333;">
            <h2 style="color: #1a1a1a; margin-bottom: 20px;">${escapeHtml(tallerNombre)}</h2>
            <p style="font-size: 16px; line-height: 1.6;">
              Estimado cliente,
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
              ${notificationType === 'completed' 
                ? 'Le informamos de que las reparaciones de su vehículo han sido completadas satisfactoriamente.'
                : 'Le comunicamos que su vehículo ya se encuentra listo para su recogida en nuestras instalaciones.'}
            </p>
            <div style="background: #f7f7f7; padding: 18px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 5px 0; font-size: 15px;"><strong>Matrícula:</strong> ${escapeHtml(vehiclePlate)}</p>
              <p style="margin: 5px 0; font-size: 15px;"><strong>Vehículo:</strong> ${escapeHtml(vehicleBrand)} ${escapeHtml(vehicleModel)}</p>
            </div>
            <p style="font-size: 15px; line-height: 1.6;">
              Puede pasar a recogerlo en el horario indicado a continuación.
            </p>
            <p style="font-size: 15px; line-height: 1.8;">
              🕐 <strong>Horario:</strong> ${escapeHtml(tallerHorario)}<br/>
              📞 <strong>Teléfono:</strong> ${escapeHtml(tallerTelefono)}<br/>
              📱 <strong>WhatsApp:</strong> ${escapeHtml(tallerWhatsapp)}
            </p>
            <p style="font-size: 15px; color: #555; margin-top: 24px;">
              Gracias por confiar en nosotros.
            </p>
            <p style="font-size: 15px; color: #333; font-weight: 600;">
              Un cordial saludo,<br/>
              ${escapeHtml(tallerNombre)}
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
        `Estimado cliente,\n\nLe informamos de que las reparaciones de su vehículo *${vehiclePlate}* (${vehicleBrand} ${vehicleModel}) han sido completadas satisfactoriamente.\n\nPuede pasar a recogerlo en nuestras instalaciones en el horario indicado a continuación.\n\n📍 *${tallerNombre}*\n🕐 ${tallerHorario}\n📞 ${tallerTelefono}\n📱 ${tallerWhatsapp}\n\nGracias por confiar en nosotros.\nUn cordial saludo.`
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
