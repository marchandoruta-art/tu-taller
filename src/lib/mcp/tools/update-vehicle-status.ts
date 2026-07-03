import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail, VEHICLE_STATUSES } from "./_shared";

export default defineTool({
  name: "update_vehicle_status",
  title: "Cambiar estado de vehículo",
  description:
    "Actualiza el estado de un vehículo (recibido, en_reparacion, pendiente_piezas, terminado, entregado, facturado, presupuestar, presupuestado).",
  inputSchema: {
    vehicle_id: z.string().uuid(),
    status: z.enum(VEHICLE_STATUSES),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  handler: async ({ vehicle_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const { data, error } = await supabaseForUser(ctx)
      .from("vehicles")
      .update({ status })
      .eq("id", vehicle_id)
      .select("id, plate, status")
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Vehículo no encontrado o sin permisos");
    return ok(data, "vehicle");
  },
});
