import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "list_vehicle_parts",
  title: "Piezas de un vehículo",
  description: "Lista las piezas/materiales asociados a un vehículo con su coste total.",
  inputSchema: {
    vehicle_id: z.string().uuid(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ vehicle_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const { data, error } = await supabaseForUser(ctx)
      .from("parts")
      .select("id, name, reference, quantity, unit_price, notes, created_at")
      .eq("vehicle_id", vehicle_id)
      .order("created_at", { ascending: true });
    if (error) return fail(error.message);
    const parts = data ?? [];
    const total = parts.reduce((s, p: any) => s + Number(p.quantity ?? 0) * Number(p.unit_price ?? 0), 0);
    return ok({ parts, total_cost: Number(total.toFixed(2)) }, "vehicle_parts");
  },
});
