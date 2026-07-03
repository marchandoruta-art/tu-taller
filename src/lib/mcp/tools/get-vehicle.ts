import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "get_vehicle",
  title: "Obtener vehículo",
  description: "Devuelve el detalle completo de un vehículo por su id o por su matrícula.",
  inputSchema: {
    id: z.string().uuid().optional(),
    plate: z.string().trim().min(1).max(20).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, plate }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    if (!id && !plate) return fail("Debe indicar id o plate");
    let q = supabaseForUser(ctx).from("vehicles").select("*").limit(1);
    if (id) q = q.eq("id", id);
    else q = q.eq("plate", plate!.toUpperCase().replace(/\s+/g, ""));
    const { data, error } = await q.maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Vehículo no encontrado");
    return ok(data, "vehicle");
  },
});
