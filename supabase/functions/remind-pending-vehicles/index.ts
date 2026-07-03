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

    // Determine slot (mañana/tarde) from current UTC hour — cron calls us at 07:00 or 13:00 UTC (winter) / 06:00 or 12:00 UTC (summer)
    const url = new URL(req.url);
    const slotParam = url.searchParams.get("slot"); // 'am' | 'pm'
    const slot = slotParam === "pm" ? "pm" : "am";
    const greeting = slot === "am" ? "☀️ Buenos días" : "🔔 Recordatorio";

    // Get all non-archived vehicles pending work with someone assigned
    const { data: vehicles, error: vErr } = await supabase
      .from("vehicles")
      .select("id, plate, status, assigned_to, organization_id")
      .in("status", ["en_reparacion", "pendiente_piezas"])
      .not("assigned_to", "is", null)
      .eq("archived", false);

    if (vErr) throw vErr;

    if (!vehicles || vehicles.length === 0) {
      return new Response(JSON.stringify({ reminded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by user
    const byUser = new Map<string, { orgId: string; plates: string[]; pending: number; parts: number }>();
    for (const v of vehicles) {
      if (!v.assigned_to) continue;
      const entry = byUser.get(v.assigned_to) ?? {
        orgId: v.organization_id,
        plates: [],
        pending: 0,
        parts: 0,
      };
      entry.plates.push(v.plate);
      if (v.status === "en_reparacion") entry.pending++;
      if (v.status === "pendiente_piezas") entry.parts++;
      byUser.set(v.assigned_to, entry);
    }

    let reminded = 0;
    const notifications: Array<{
      user_id: string;
      organization_id: string;
      type: string;
      message: string;
    }> = [];

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

      // Push notification (best-effort)
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            type: "pending_vehicles_reminder",
            title,
            body,
            url: "/vehicles",
            user_ids: [userId],
            organization_id: data.orgId,
          }),
        });
      } catch (err) {
        console.error("push failed for", userId, err);
      }
      reminded++;
    }

    if (notifications.length > 0) {
      const { error: nErr } = await supabase.from("notifications").insert(notifications);
      if (nErr) console.error("notifications insert error", nErr);
    }

    return new Response(JSON.stringify({ reminded, slot }), {
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
