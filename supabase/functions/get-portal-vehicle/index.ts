import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
      return json({ error: "Token inválido" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: tokenRow, error: tErr } = await supabase
      .from("client_portal_tokens")
      .select("id, vehicle_id, organization_id, expires_at, revoked")
      .eq("token", token)
      .maybeSingle();

    if (tErr || !tokenRow) return json({ error: "Enlace no encontrado" }, 404);
    if (tokenRow.revoked) return json({ error: "Enlace revocado" }, 403);
    if (new Date(tokenRow.expires_at) < new Date()) return json({ error: "Enlace caducado" }, 410);

    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .select("plate, brand, model, year, color, status, work_summary, client_tasks, delivered_at")
      .eq("id", tokenRow.vehicle_id)
      .maybeSingle();

    if (vErr || !vehicle) return json({ error: "Vehículo no disponible" }, 404);

    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", tokenRow.organization_id)
      .maybeSingle();

    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("organization_id", tokenRow.organization_id)
      .in("key", ["taller_telefono", "taller_whatsapp", "taller_horario"]);

    const s: Record<string, string> = {};
    (settings || []).forEach((r: any) => { if (r.value) s[r.key] = r.value; });

    const tasks: { text: string; done: boolean }[] = Array.isArray(vehicle.client_tasks)
      ? (vehicle.client_tasks as any)
      : [];
    const done = tasks.filter((t) => t.done).length;

    // Pending approvals
    const { data: approvals } = await supabase
      .from("client_approvals")
      .select("id, description, estimated_info, status, created_at, client_response_at")
      .eq("vehicle_id", tokenRow.vehicle_id)
      .order("created_at", { ascending: false });

    return json({
      vehicle: {
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        status: vehicle.status,
        work_summary: vehicle.work_summary,
        client_tasks: tasks,
        delivered_at: vehicle.delivered_at,
      },
      workshop: {
        name: org?.name || "Taller",
        phone: s.taller_telefono,
        whatsapp: s.taller_whatsapp,
        horario: s.taller_horario,
      },
      progress: { done, total: tasks.length },
      approvals: approvals || [],
      portal_token: token,
    }, 200);
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
