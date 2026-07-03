import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "list_vehicles",
  title: "Listar vehículos",
  description:
    "Lista vehículos del taller del usuario autenticado. Permite filtrar por estado y buscar por matrícula/marca/modelo.",
  inputSchema: {
    status: z
      .enum(["recibido", "en_reparacion", "pendiente_piezas", "terminado", "entregado", "facturado", "presupuestar", "presupuestado"])
      .optional(),
    search: z.string().trim().min(1).max(50).optional(),
    only_mine: z.boolean().optional().describe("Solo vehículos asignados al usuario actual."),
    include_archived: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, search, only_mine, include_archived, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    let q = supabaseForUser(ctx)
      .from("vehicles")
      .select("id, plate, brand, model, year, status, priority, assigned_to, owner_id, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 25);
    if (!include_archived) q = q.eq("archived", false);
    if (status) q = q.eq("status", status);
    if (only_mine) q = q.eq("assigned_to", ctx.getUserId());
    if (search) {
      const s = search.replace(/[%,]/g, "");
      q = q.or(`plate.ilike.%${s}%,brand.ilike.%${s}%,model.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) return fail(error.message);
    return ok(data ?? [], "vehicles");
  },
});
