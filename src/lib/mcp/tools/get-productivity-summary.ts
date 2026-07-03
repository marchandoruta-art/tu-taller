import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "get_productivity_summary",
  title: "Resumen de productividad",
  description:
    "Devuelve minutos trabajados por operario en un rango de fechas (por defecto últimos 7 días).",
  inputSchema: {
    from: z.string().optional().describe("Fecha inicio ISO/YYYY-MM-DD."),
    to: z.string().optional().describe("Fecha fin ISO/YYYY-MM-DD."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true },
  handler: async ({ from, to }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const start = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const end = to ? new Date(to) : new Date();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("time_logs")
      .select("user_id, total_minutes, started_at, ended_at")
      .gte("started_at", start.toISOString())
      .lte("started_at", end.toISOString());
    if (error) return fail(error.message);

    const agg: Record<string, { minutes: number; sessions: number }> = {};
    for (const t of data ?? []) {
      const uid = t.user_id!;
      agg[uid] ??= { minutes: 0, sessions: 0 };
      agg[uid].minutes += t.total_minutes ?? 0;
      agg[uid].sessions++;
    }
    const uids = Object.keys(agg);
    let names: Record<string, string> = {};
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", uids);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.user_id, p.full_name]));
    }
    const rows = Object.entries(agg).map(([uid, s]) => ({
      user_id: uid,
      name: names[uid] ?? "(desconocido)",
      minutes: s.minutes,
      hours: Number((s.minutes / 60).toFixed(2)),
      sessions: s.sessions,
    })).sort((a, b) => b.minutes - a.minutes);
    return ok({ from: start.toISOString(), to: end.toISOString(), rows }, "productivity");
  },
});
