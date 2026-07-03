import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "list_pending_client_tasks",
  title: "Tareas de cliente pendientes",
  description: "Lista tareas del cliente (checklist) pendientes en vehículos activos.",
  inputSchema: {
    only_mine: z.boolean().optional().describe("Solo vehículos asignados al usuario actual."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ only_mine, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("vehicles")
      .select("id, plate, brand, model, status, client_tasks, assigned_to")
      .eq("archived", false)
      .in("status", ["recibido", "en_reparacion", "pendiente_piezas"])
      .limit(limit ?? 100);
    if (only_mine) q = q.eq("assigned_to", ctx.getUserId());
    const { data, error } = await q;
    if (error) return fail(error.message);

    const rows: any[] = [];
    for (const v of data ?? []) {
      const tasks = Array.isArray(v.client_tasks) ? v.client_tasks : [];
      const pending = tasks.filter((t: any) => t && t.done === false);
      if (pending.length) rows.push({ vehicle_id: v.id, plate: v.plate, brand: v.brand, model: v.model, status: v.status, pending_tasks: pending });
    }
    return ok(rows, "pending");
  },
});
