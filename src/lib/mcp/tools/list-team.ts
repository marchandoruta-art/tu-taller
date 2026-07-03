import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "list_team",
  title: "Listar equipo",
  description: "Lista los usuarios del taller con su rol (para conocer IDs de operarios a asignar).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true },
  handler: async (_a, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    const { data: profs, error } = await supabase.from("profiles").select("user_id, full_name, organization_id");
    if (error) return fail(error.message);
    const ids = (profs ?? []).map((p: any) => p.user_id);
    const roles = ids.length
      ? (await supabase.from("user_roles").select("user_id, role").in("user_id", ids)).data ?? []
      : [];
    const roleMap = Object.fromEntries(roles.map((r: any) => [r.user_id, r.role]));
    return ok(
      (profs ?? []).map((p: any) => ({ user_id: p.user_id, name: p.full_name, role: roleMap[p.user_id] ?? null })),
      "team",
    );
  },
});
