import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "add_client_task",
  title: "Añadir tarea de cliente",
  description: "Añade una nueva tarea al checklist del cliente en un vehículo.",
  inputSchema: {
    vehicle_id: z.string().uuid(),
    text: z.string().trim().min(1).max(300),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  handler: async ({ vehicle_id, text }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    const { data: v, error: e1 } = await supabase
      .from("vehicles")
      .select("client_tasks")
      .eq("id", vehicle_id)
      .maybeSingle();
    if (e1) return fail(e1.message);
    if (!v) return fail("Vehículo no encontrado");
    const tasks = Array.isArray(v.client_tasks) ? v.client_tasks : [];
    const next = [...tasks, { text, done: false }];
    const { error: e2 } = await supabase.from("vehicles").update({ client_tasks: next }).eq("id", vehicle_id);
    if (e2) return fail(e2.message);
    return ok({ vehicle_id, tasks: next }, "vehicle");
  },
});
