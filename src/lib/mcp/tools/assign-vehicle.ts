import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "assign_vehicle",
  title: "Asignar operario",
  description: "Asigna (o desasigna con user_id=null) un vehículo a un operario.",
  inputSchema: {
    vehicle_id: z.string().uuid(),
    user_id: z.string().uuid().nullable().describe("ID del operario o null para desasignar."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  handler: async ({ vehicle_id, user_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const { data, error } = await supabaseForUser(ctx)
      .from("vehicles")
      .update({ assigned_to: user_id })
      .eq("id", vehicle_id)
      .select("id, plate, assigned_to")
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Vehículo no encontrado o sin permisos");
    return ok(data, "vehicle");
  },
});
