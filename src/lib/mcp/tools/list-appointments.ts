import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_appointments",
  title: "Listar citas",
  description: "Lista citas del taller en un rango de fechas (por defecto próximos 7 días).",
  inputSchema: {
    from: z.string().datetime().optional().describe("Fecha inicial ISO 8601."),
    to: z.string().datetime().optional().describe("Fecha final ISO 8601."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const start = from ?? new Date().toISOString();
    const end = to ?? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .gte("appointment_date", start)
      .lte("appointment_date", end)
      .order("appointment_date", { ascending: true })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { appointments: data ?? [] },
    };
  },
});
