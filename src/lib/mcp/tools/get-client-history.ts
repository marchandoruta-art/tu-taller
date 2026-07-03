import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "get_client_history",
  title: "Historial de cliente",
  description: "Devuelve todos los vehículos y visitas de un cliente por su id.",
  inputSchema: { owner_id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ owner_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    const { data: owner, error: e1 } = await supabase
      .from("owners")
      .select("*")
      .eq("id", owner_id)
      .maybeSingle();
    if (e1) return fail(e1.message);
    if (!owner) return fail("Cliente no encontrado");

    const { data: vehicles, error: e2 } = await supabase
      .from("vehicles")
      .select("id, plate, brand, model, status, created_at, delivered_at, work_summary, archived")
      .eq("owner_id", owner_id)
      .order("created_at", { ascending: false });
    if (e2) return fail(e2.message);

    return ok({ owner, vehicles: vehicles ?? [] }, "client");
  },
});
