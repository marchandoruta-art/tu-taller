import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get tomorrow's date in YYYY-MM-DD format (Spain timezone UTC+1/+2)
    const now = new Date();
    // Approximate Spain time by adding 1-2 hours; use +2 (CEST) for safety
    const spainOffset = 2 * 60 * 60 * 1000;
    const spainNow = new Date(now.getTime() + spainOffset);
    const tomorrow = new Date(spainNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    console.log(`Checking appointments for: ${tomorrowStr}`);

    // Fetch tomorrow's appointments that have a phone number
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("id, client_name, client_phone, vehicle_plate, vehicle_brand, vehicle_model, appointment_date, appointment_time, organization_id")
      .eq("appointment_date", tomorrowStr)
      .not("client_phone", "is", null);

    if (apptError) {
      console.error("Error fetching appointments:", apptError);
      return new Response(JSON.stringify({ error: "Failed to fetch appointments" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!appointments || appointments.length === 0) {
      console.log("No appointments for tomorrow");
      return new Response(JSON.stringify({ reminders: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let remindersSent = 0;

    for (const appt of appointments) {
      if (!appt.client_phone) continue;

      // Build WhatsApp message
      const cleanPhone = appt.client_phone.replace(/[\s\-\(\)]/g, "");
      const phoneWithCode = cleanPhone.startsWith("+") ? cleanPhone : `+34${cleanPhone}`;
      const phoneNumber = phoneWithCode.replace("+", "");

      const vehicleParts = [appt.vehicle_brand, appt.vehicle_model].filter(Boolean);
      const vehicleInfo = vehicleParts.length > 0 ? vehicleParts.join(" ") : "";
      const plateInfo = appt.vehicle_plate ? ` (${appt.vehicle_plate})` : "";
      const timeInfo = appt.appointment_time
        ? ` a las ${appt.appointment_time.substring(0, 5)}`
        : "";

      const vehicleText = vehicleInfo ? ` para su vehículo ${vehicleInfo}${plateInfo}` : (appt.vehicle_plate ? ` para el vehículo ${appt.vehicle_plate}` : "");

      const message = `Buenos días,\n\nDesde Taller Autos Formentera nos ponemos en contacto con usted para recordarle que tiene programada una cita en nuestro taller para mañana${timeInfo}${vehicleText}.\n\nLe rogamos confirme su asistencia o, en caso de no poder acudir, nos lo comunique con la mayor antelación posible para poder reorganizar nuestra agenda.\n\n🕐 Horario de atención: lunes a viernes de 8:00 a 16:00h\n📞 Teléfono: 971 322 883\n📱 WhatsApp: 689 907 343\n\nGracias por su confianza.\n\nUn cordial saludo,\nTaller Autos Formentera`;

      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

      // Get admin user_ids for this organization
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("organization_id", appt.organization_id)
        .in("role", ["admin", "oficina"]);

      if (!adminRoles || adminRoles.length === 0) continue;

      // Create a notification for each admin/oficina user with the WhatsApp link
      const notifVehicle = vehicleInfo ? ` - ${vehicleInfo}${plateInfo}` : (appt.vehicle_plate ? ` - ${appt.vehicle_plate}` : "");
      const notificationMessage = `📅 Recordatorio cita mañana${timeInfo}: ${appt.client_name}${notifVehicle}. Enviar WhatsApp: ${whatsappUrl}`;

      const notifications = adminRoles.map((role) => ({
        user_id: role.user_id,
        organization_id: appt.organization_id,
        type: "appointment_reminder",
        message: notificationMessage,
        vehicle_id: null,
      }));

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting notification:", insertError);
      } else {
        remindersSent += adminRoles.length;
      }

      // Also send push notification to admins
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            type: "appointment_reminder",
            title: "📅 Recordatorio de cita",
            body: `${appt.client_name}${timeInfo}${vehicleInfo ? ` - ${vehicleInfo}` : ""}`,
            user_ids: adminRoles.map((r) => r.user_id),
            organization_id: appt.organization_id,
          }),
        });
      } catch (pushErr) {
        console.error("Error sending push:", pushErr);
      }
    }

    console.log(`Reminders sent: ${remindersSent}`);
    return new Response(JSON.stringify({ reminders: remindersSent, appointments: appointments.length }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in reminder-appointments:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
