import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyClientRequest {
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  notificationType: 'completed' | 'ready_pickup';
}

const escapeHtml = (str: string): string =>
  str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m));

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      ownerName, 
      ownerEmail, 
      ownerPhone, 
      vehiclePlate, 
      vehicleBrand, 
      vehicleModel,
      notificationType 
    }: NotifyClientRequest = await req.json();

    const results: { email?: string; whatsapp?: string; emailError?: string } = {};

    // Send email if RESEND_API_KEY is configured and owner has email
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey && ownerEmail) {
      try {
        const subject = notificationType === 'completed' 
          ? `Su vehículo ${vehiclePlate} está terminado`
          : `Su vehículo ${vehiclePlate} está listo para recoger`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333;">¡Hola ${ownerName}!</h1>
            <p style="font-size: 16px; color: #555;">
              ${notificationType === 'completed' 
                ? 'Le informamos que su vehículo ha sido reparado y está listo.'
                : 'Su vehículo está listo para ser recogido en nuestras instalaciones.'}
            </p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px;">Datos del vehículo:</h3>
              <p style="margin: 5px 0;"><strong>Matrícula:</strong> ${vehiclePlate}</p>
              <p style="margin: 5px 0;"><strong>Vehículo:</strong> ${vehicleBrand} ${vehicleModel}</p>
            </div>
            <p style="font-size: 14px; color: #888;">
              Puede pasar a recogerlo en nuestro horario de atención.
            </p>
            <p style="font-size: 14px; color: #888;">
              Gracias por confiar en nosotros.
            </p>
          </div>
        `;

        // Use Resend API directly via fetch
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
          results.emailError = errorData.message || "Error sending email";
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        results.email = "failed";
      }
    }

    // Generate WhatsApp link if owner has phone
    if (ownerPhone) {
      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhone = ownerPhone.replace(/[\s\-\(\)]/g, '');
      // Add country code if not present (assuming Spain +34)
      const phoneWithCode = cleanPhone.startsWith('+') ? cleanPhone : `+34${cleanPhone}`;
      
      const message = encodeURIComponent(
        `Estimado/a ${ownerName},

Le informamos de que su vehículo ${vehiclePlate} (${vehicleBrand} ${vehicleModel}) ya se encuentra terminado y disponible para su recogida en nuestras instalaciones.

Puede pasar a retirarlo dentro de nuestro horario habitual.

Quedamos a su disposición para cualquier aclaración.

Atentamente,
Taller Autos Formentera Es Brolls S.L.`
      );
      
      // Return WhatsApp API link
      results.whatsapp = `https://wa.me/${phoneWithCode.replace('+', '')}?text=${message}`;
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Error in notify-client function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
