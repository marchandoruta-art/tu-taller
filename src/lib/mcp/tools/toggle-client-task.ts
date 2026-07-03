import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "toggle_client_task",
  title: "Marcar/desmarcar tarea",
  description: "Marca como hecha o pendiente una tarea del cliente por su texto exacto (o índice 0-based).",
  inputSchema: {
    vehicle_id: z.string().uuid(),
    task_text: z.string().trim().min(1).max(300).optional(),
    task_index: z.number().int().min(0).optional(),
    done: z.boolean(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true },
  handler: async ({ vehicle_id, task_text, task_index, done }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    if (task_text == null && task_index == null) return fail("Indica task_text o task_index");
    const supabase = supabaseForUser(ctx);
    const { data: v, error: e1 } = await supabase.from("vehicles").select("client_tasks").eq("id", vehicle_id).maybeSingle();
    if (e1) return fail(e1.message);
    if (!v) return fail("Vehículo no encontrado");
    const tasks = Array.isArray(v.client_tasks) ? [...v.client_tasks] : [];
    let idx = task_index ?? -1;
    if (idx < 0 && task_text) idx = tasks.findIndex((t: any) => (t?.text ?? "").trim() === task_text.trim());
    if (idx < 0 || idx >= tasks.length) return fail("Tarea no encontrada");
    tasks[idx] = { ...tasks[idx], done };
    const { error: e2 } = await supabase.from("vehicles").update({ client_tasks: tasks }).eq("id", vehicle_id);
    if (e2) return fail(e2.message);
    return ok({ vehicle_id, updated: tasks[idx], tasks }, "vehicle");
  },
});
