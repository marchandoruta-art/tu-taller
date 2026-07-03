import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail, PRIORITIES } from "./_shared";

export default defineTool({
  name: "update_vehicle_priority",
  title: "Cambiar prioridad",
  description: "Actualiza la prioridad de un vehículo (baja, normal, alta, urgente).",
  inputSchema: {
    vehicle_id: z.string().uuid(),
    priority: z.enum(PRIORITIES),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  handler: async ({ vehicle_id, priority }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const { data, error } = await supabaseForUser(ctx)
      .from("vehicles")
      .update({ priority })
      .eq("id", vehicle_id)
      .select("id, plate, priority")
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Vehículo no encontrado o sin permisos");
    return ok(data, "vehicle");
  },
});
