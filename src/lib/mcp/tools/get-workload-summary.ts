import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "get_workload_summary",
  title: "Resumen de carga de trabajo",
  description:
    "Devuelve, por operario, el nº de vehículos activos (recibido, en_reparacion, pendiente_piezas) y una cuenta por estado.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, plate, status, assigned_to, priority")
      .eq("archived", false)
      .in("status", ["recibido", "en_reparacion", "pendiente_piezas", "terminado"]);
    if (error) return fail(error.message);

    const byUser: Record<string, { total: number; by_status: Record<string, number>; plates: string[] }> = {};
    for (const v of data ?? []) {
      const uid = v.assigned_to ?? "unassigned";
      byUser[uid] ??= { total: 0, by_status: {}, plates: [] };
      byUser[uid].total++;
      byUser[uid].by_status[v.status] = (byUser[uid].by_status[v.status] ?? 0) + 1;
      byUser[uid].plates.push(v.plate);
    }

    const userIds = Object.keys(byUser).filter((u) => u !== "unassigned");
    let names: Record<string, string> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.user_id, p.full_name]));
    }

    const summary = Object.entries(byUser).map(([uid, s]) => ({
      user_id: uid === "unassigned" ? null : uid,
      name: uid === "unassigned" ? "Sin asignar" : names[uid] ?? "(desconocido)",
      ...s,
    }));
    return ok(summary, "workload");
  },
});
