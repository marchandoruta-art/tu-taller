import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "add_part",
  title: "Añadir pieza / material",
  description: "Registra una pieza o material usado en un vehículo con cantidad y precio unitario.",
  inputSchema: {
    vehicle_id: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    quantity: z.number().positive(),
    unit_price: z.number().min(0).optional(),
    reference: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(500).optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    const { data: v, error: eV } = await supabase
      .from("vehicles").select("organization_id").eq("id", args.vehicle_id).maybeSingle();
    if (eV) return fail(eV.message);
    if (!v) return fail("Vehículo no encontrado");
    const { data, error } = await supabase.from("parts").insert({
      ...args,
      unit_price: args.unit_price ?? 0,
      organization_id: v.organization_id,
      added_by: ctx.getUserId(),
    }).select().maybeSingle();
    if (error) return fail(error.message);
    return ok(data, "part");
  },
});
