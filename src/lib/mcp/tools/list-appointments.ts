import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "list_appointments",
  title: "Listar citas",
  description: "Lista citas del taller en un rango de fechas (por defecto próximos 7 días).",
  inputSchema: {
    from: z.string().optional().describe("Fecha inicial YYYY-MM-DD o ISO."),
    to: z.string().optional().describe("Fecha final YYYY-MM-DD o ISO."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const start = (from ?? new Date().toISOString()).slice(0, 10);
    const end = (to ?? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()).slice(0, 10);
    const { data, error } = await supabaseForUser(ctx)
      .from("appointments")
      .select("*")
      .gte("appointment_date", start)
      .lte("appointment_date", end)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true, nullsFirst: true })
      .limit(limit ?? 50);
    if (error) return fail(error.message);
    return ok(data ?? [], "appointments");
  },
});
