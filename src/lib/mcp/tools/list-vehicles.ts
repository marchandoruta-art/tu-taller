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
  name: "list_vehicles",
  title: "Listar vehículos",
  description:
    "Lista vehículos del taller del usuario autenticado. Permite filtrar por estado y buscar por matrícula/marca/modelo.",
  inputSchema: {
    status: z
      .enum(["recibido", "en_reparacion", "pendiente_piezas", "terminado", "entregado", "facturado"])
      .optional()
      .describe("Filtra por estado del vehículo."),
    search: z.string().trim().min(1).max(50).optional().describe("Búsqueda por matrícula, marca o modelo."),
    include_archived: z.boolean().optional().describe("Incluir vehículos archivados. Por defecto false."),
    limit: z.number().int().min(1).max(100).optional().describe("Máximo de resultados (por defecto 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, search, include_archived, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("vehicles")
      .select("id, plate, brand, model, year, status, priority, assigned_to, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 25);

    if (!include_archived) q = q.eq("archived", false);
    if (status) q = q.eq("status", status);
    if (search) {
      const s = search.replace(/[%,]/g, "");
      q = q.or(`plate.ilike.%${s}%,brand.ilike.%${s}%,model.ilike.%${s}%`);
    }

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { vehicles: data ?? [] },
    };
  },
});
