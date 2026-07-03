import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "add_vehicle_note",
  title: "Añadir nota al vehículo",
  description:
    "Añade una nota al resumen de trabajo (work_summary) o a las notas de recepción (reception_notes). Se añade al final con marca de tiempo.",
  inputSchema: {
    vehicle_id: z.string().uuid(),
    note: z.string().trim().min(1).max(2000),
    field: z.enum(["work_summary", "reception_notes"]).optional().describe("Por defecto work_summary."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false },
  handler: async ({ vehicle_id, note, field }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const col = field ?? "work_summary";
    const supabase = supabaseForUser(ctx);
    const { data: v, error: e1 } = await supabase.from("vehicles").select(col).eq("id", vehicle_id).maybeSingle();
    if (e1) return fail(e1.message);
    if (!v) return fail("Vehículo no encontrado");
    const prev = (v as any)[col] ?? "";
    const stamp = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
    const appended = prev ? `${prev}\n\n[${stamp}] ${note}` : `[${stamp}] ${note}`;
    const { error: e2 } = await supabase.from("vehicles").update({ [col]: appended }).eq("id", vehicle_id);
    if (e2) return fail(e2.message);
    return ok({ vehicle_id, field: col, value: appended }, "vehicle");
  },
});
