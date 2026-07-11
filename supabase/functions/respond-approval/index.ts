import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portalToken, approvalId, response, note } = await req.json();
    if (!portalToken || !approvalId || !["aprobado", "rechazado"].includes(response)) {
      return json({ error: "Datos inválidos" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate portal token
    const { data: tokenRow } = await supabase
      .from("client_portal_tokens")
      .select("vehicle_id, organization_id, expires_at, revoked")
      .eq("token", portalToken)
      .maybeSingle();

    if (!tokenRow) return json({ error: "Token no encontrado" }, 404);
    if (tokenRow.revoked) return json({ error: "Token revocado" }, 403);
    if (new Date(tokenRow.expires_at) < new Date()) return json({ error: "Token caducado" }, 410);

    // Validate approval belongs to vehicle
    const { data: approval } = await supabase
      .from("client_approvals")
      .select("id, vehicle_id, organization_id, status, description")
      .eq("id", approvalId)
      .maybeSingle();

    if (!approval) return json({ error: "Aprobación no encontrada" }, 404);
    if (approval.vehicle_id !== tokenRow.vehicle_id) return json({ error: "No autorizado" }, 403);
    if (approval.status !== "pendiente") return json({ error: "Ya respondida" }, 409);

    const { error: uErr } = await supabase
      .from("client_approvals")
      .update({
        status: response,
        client_response_at: new Date().toISOString(),
        client_note: (note || "").toString().slice(0, 500) || null,
      })
      .eq("id", approvalId);

    if (uErr) return json({ error: uErr.message }, 500);

    // Notify admins of the org
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", approval.organization_id)
      .in("role", ["admin", "oficina"]);

    const label = response === "aprobado" ? "✅ Cliente APROBÓ" : "❌ Cliente RECHAZÓ";
    if (admins && admins.length > 0) {
      await supabase.from("notifications").insert(
        admins.map((a: any) => ({
          user_id: a.user_id,
          organization_id: approval.organization_id,
          vehicle_id: approval.vehicle_id,
          type: "client_approval_response",
          message: `${label} el trabajo: ${approval.description.slice(0, 120)}`,
        }))
      );

      // Audit log
      await supabase.from("audit_log").insert({
        organization_id: approval.organization_id,
        user_id: null,
        action: "client_approval_response",
        entity_type: "client_approval",
        entity_id: approvalId,
        details: { response, note: note || null, via: "portal" },
      });

      // Push best-effort
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            type: "client_approval_response",
            title: label,
            body: approval.description.slice(0, 140),
            url: `/vehicles/${approval.vehicle_id}`,
            user_ids: admins.map((a: any) => a.user_id),
            organization_id: approval.organization_id,
          }),
        });
      } catch (_) { /* ignore */ }
    }

    return json({ ok: true }, 200);
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
