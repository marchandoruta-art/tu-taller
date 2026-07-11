import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action"); // 'view' | 'confirm' | 'cancel'

    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return json({ error: "Token inválido" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: apt } = await supabase
      .from("appointments")
      .select("id, organization_id, appointment_date, appointment_time, client_name, vehicle_plate, vehicle_brand, vehicle_model, confirmation_status, confirmed_at")
      .eq("confirmation_token", token)
      .maybeSingle();

    if (!apt) return json({ error: "Cita no encontrada" }, 404);

    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", apt.organization_id)
      .maybeSingle();

    if (action === "confirm" || action === "cancel") {
      const newStatus = action === "confirm" ? "confirmada" : "cancelada";
      const { error: uErr } = await supabase
        .from("appointments")
        .update({ confirmation_status: newStatus, confirmed_at: new Date().toISOString() })
        .eq("id", apt.id);
      if (uErr) return json({ error: uErr.message }, 500);
      apt.confirmation_status = newStatus as any;
      apt.confirmed_at = new Date().toISOString();

      // notify office/admins
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("organization_id", apt.organization_id)
        .in("role", ["admin", "oficina"]);
      if (admins && admins.length > 0) {
        const label = newStatus === "confirmada" ? "✅ Cita CONFIRMADA" : "❌ Cita CANCELADA";
        await supabase.from("notifications").insert(
          admins.map((a: any) => ({
            user_id: a.user_id,
            organization_id: apt.organization_id,
            type: "appointment_confirmation",
            message: `${label}: ${apt.client_name} — ${apt.appointment_date}${apt.appointment_time ? " " + apt.appointment_time.slice(0,5) : ""}`,
          }))
        );
      }
    }

    return json({
      appointment: {
        date: apt.appointment_date,
        time: apt.appointment_time,
        client_name: apt.client_name,
        plate: apt.vehicle_plate,
        brand: apt.vehicle_brand,
        model: apt.vehicle_model,
        status: apt.confirmation_status,
        confirmed_at: apt.confirmed_at,
      },
      workshop: { name: org?.name || "Taller" },
    });
  } catch (e: any) {
    return json({ error: e?.message || "Error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
