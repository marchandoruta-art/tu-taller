import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "search_owners",
  title: "Buscar clientes",
  description: "Busca clientes (propietarios) por nombre, teléfono o email.",
  inputSchema: {
    search: z.string().trim().min(1).max(80).describe("Texto a buscar."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const s = search.replace(/[%,]/g, "");
    const { data, error } = await supabaseForUser(ctx)
      .from("owners")
      .select("id, name, phone, email, dni, address")
      .or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`)
      .limit(limit ?? 20);
    if (error) return fail(error.message);
    return ok(data ?? [], "owners");
  },
});
