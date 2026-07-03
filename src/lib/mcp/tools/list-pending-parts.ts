import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "list_pending_parts",
  title: "Piezas pendientes",
  description: "Lista las piezas/materiales que aún no se han recibido (received = false).",
  inputSchema: {
    vehicle_id: z.string().uuid().optional().describe("Filtra por vehículo."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ vehicle_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    let q = supabaseForUser(ctx)
      .from("parts")
      .select("id, vehicle_id, name, quantity, supplier, received, requested_at, notes")
      .eq("received", false)
      .order("requested_at", { ascending: true })
      .limit(limit ?? 100);
    if (vehicle_id) q = q.eq("vehicle_id", vehicle_id);
    const { data, error } = await q;
    if (error) return fail(error.message);
    return ok(data ?? [], "parts");
  },
});
