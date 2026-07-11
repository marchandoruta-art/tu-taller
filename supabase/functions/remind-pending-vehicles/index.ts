import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!auth || auth !== serviceKey) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const slotParam = url.searchParams.get("slot");
    const slot = slotParam === "pm" ? "pm" : "am";
    const greeting = slot === "am" ? "☀️ Buenos días" : "🔔 Recordatorio";

    // ------ 1) Pending work reminders (as before) ------
    const { data: vehicles, error: vErr } = await supabase
      .from("vehicles")
      .select("id, plate, status, assigned_to, organization_id")
      .in("status", ["en_reparacion", "pendiente_piezas"])
      .not("assigned_to", "is", null)
      .eq("archived", false);
    if (vErr) throw vErr;

    let reminded = 0;
    const notifications: any[] = [];
    if (vehicles && vehicles.length > 0) {
      const byUser = new Map<string, { orgId: string; plates: string[]; pending: number; parts: number }>();
      for (const v of vehicles) {
        if (!v.assigned_to) continue;
        const entry = byUser.get(v.assigned_to) ?? { orgId: v.organization_id, plates: [], pending: 0, parts: 0 };
        entry.plates.push(v.plate);
        if (v.status === "en_reparacion") entry.pending++;
        if (v.status === "pendiente_piezas") entry.parts++;
        byUser.set(v.assigned_to, entry);
      }
      for (const [userId, data] of byUser.entries()) {
        const total = data.plates.length;
        const parts: string[] = [];
        if (data.pending > 0) parts.push(`${data.pending} en reparación`);
        if (data.parts > 0) parts.push(`${data.parts} pendiente${data.parts !== 1 ? "s" : ""} de piezas`);
        const summary = parts.join(" · ");
        const platesShown = data.plates.slice(0, 5).join(", ");
        const platesExtra = data.plates.length > 5 ? ` (+${data.plates.length - 5} más)` : "";
        const title = `${greeting} — ${total} vehículo${total !== 1 ? "s" : ""} pendiente${total !== 1 ? "s" : ""}`;
        const body = `${summary}\n${platesShown}${platesExtra}`;
        notifications.push({
          user_id: userId,
          organization_id: data.orgId,
          type: "pending_vehicles_reminder",
          message: `${title}: ${body.replace(/\n/g, " — ")}`,
        });
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              type: "pending_vehicles_reminder", title, body, url: "/vehicles",
              user_ids: [userId], organization_id: data.orgId,
            }),
          });
        } catch (err) { console.error("push failed for", userId, err); }
        reminded++;
      }
    }

    // ------ 2) Overdue pickup reminders (terminado > 48h) ------
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: stalled } = await supabase
      .from("vehicles")
      .select("id, plate, brand, model, organization_id, updated_at")
      .eq("status", "terminado")
      .eq("archived", false)
      .lte("updated_at", cutoff);

    let pickupReminded = 0;
    if (stalled && stalled.length > 0) {
      // Group by org, notify admin/oficina in each org
      const byOrg = new Map<string, typeof stalled>();
      for (const v of stalled) {
        const arr = byOrg.get(v.organization_id) || [];
        arr.push(v);
        byOrg.set(v.organization_id, arr);
      }
      for (const [orgId, list] of byOrg.entries()) {
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("organization_id", orgId)
          .in("role", ["admin", "oficina"]);
        if (!admins || admins.length === 0) continue;

        for (const v of list) {
          const days = Math.floor((Date.now() - new Date(v.updated_at).getTime()) / (24 * 3600 * 1000));
          const msg = `⏰ Sin recoger: ${v.plate} (${v.brand} ${v.model}) — ${days} día${days !== 1 ? "s" : ""}`;
          notifications.push(
            ...admins.map((a: any) => ({
              user_id: a.user_id,
              organization_id: orgId,
              vehicle_id: v.id,
              type: "vehicle_pickup_overdue",
              message: msg,
            }))
          );
          pickupReminded++;
        }
      }
    }

    if (notifications.length > 0) {
      const { error: nErr } = await supabase.from("notifications").insert(notifications);
      if (nErr) console.error("notifications insert error", nErr);
    }

    return new Response(JSON.stringify({ reminded, pickupReminded, slot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("remind-pending-vehicles error:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
