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
  name: "get_vehicle",
  title: "Obtener vehículo",
  description: "Devuelve el detalle completo de un vehículo por su id o por su matrícula.",
  inputSchema: {
    id: z.string().uuid().optional().describe("ID del vehículo."),
    plate: z.string().trim().min(1).max(20).optional().describe("Matrícula del vehículo."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, plate }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    if (!id && !plate) {
      return { content: [{ type: "text", text: "Debe indicar id o plate" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("vehicles").select("*").limit(1);
    if (id) q = q.eq("id", id);
    else q = q.eq("plate", plate!.toUpperCase().replace(/\s+/g, ""));

    const { data, error } = await q.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Vehículo no encontrado" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { vehicle: data },
    };
  },
});
