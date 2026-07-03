import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail, APPOINTMENT_TYPES } from "./_shared";

export default defineTool({
  name: "create_appointment",
  title: "Crear cita",
  description: "Crea una cita previa en la agenda del taller.",
  inputSchema: {
    appointment_date: z.string().describe("Fecha en formato YYYY-MM-DD."),
    appointment_time: z.string().optional().describe("Hora HH:MM (opcional)."),
    client_name: z.string().trim().min(1).max(150),
    client_phone: z.string().trim().max(30).optional(),
    vehicle_plate: z.string().trim().max(20).optional(),
    vehicle_brand: z.string().trim().max(60).optional(),
    vehicle_model: z.string().trim().max(60).optional(),
    issue_description: z.string().trim().max(2000).optional(),
    appointment_type: z.enum(APPOINTMENT_TYPES).optional(),
    assigned_to: z.string().uuid().optional(),
    notes: z.string().trim().max(1000).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    const { data: prof, error: eP } = await supabase
      .from("profiles").select("organization_id").eq("user_id", ctx.getUserId()).maybeSingle();
    if (eP) return fail(eP.message);
    if (!prof?.organization_id) return fail("Usuario sin organización");

    const { data, error } = await supabase.from("appointments").insert({
      ...args,
      appointment_type: args.appointment_type ?? "mecanica",
      organization_id: prof.organization_id,
      created_by: ctx.getUserId(),
    }).select().maybeSingle();
    if (error) return fail(error.message);
    return ok(data, "appointment");
  },
});
