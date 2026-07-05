import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail, PRIORITIES } from "./_shared";

export default defineTool({
  name: "create_vehicle",
  title: "Crear vehículo (ficha de recepción)",
  description:
    "Crea directamente un vehículo (orden de trabajo) en estado 'recibido'. Opcionalmente crea el propietario si se pasa client_name. Ideal cuando llega un coche nuevo al taller y quieres saltarte la cita previa.",
  inputSchema: {
    plate: z.string().trim().min(1).max(20).describe("Matrícula del vehículo."),
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(60),
    year: z.number().int().min(1900).max(2100).optional(),
    color: z.string().trim().max(40).optional(),
    vin: z.string().trim().max(30).optional(),
    mileage: z.number().int().min(0).optional(),
    client_description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .describe("Descripción del cliente / motivo de entrada."),
    client_tasks: z
      .array(z.string().trim().min(1))
      .optional()
      .describe("Lista de tareas solicitadas por el cliente (una por línea)."),
    priority: z.enum(PRIORITIES).optional(),
    assigned_to: z.string().uuid().optional(),
    client_name: z.string().trim().max(150).optional().describe("Si se pasa, se crea o busca el propietario."),
    client_phone: z.string().trim().max(30).optional(),
    client_email: z.string().trim().max(150).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);

    const { data: prof, error: eP } = await supabase
      .from("profiles").select("organization_id").eq("user_id", ctx.getUserId()).maybeSingle();
    if (eP) return fail(eP.message);
    if (!prof?.organization_id) return fail("Usuario sin organización");

    let owner_id: string | null = null;
    if (args.client_name) {
      const { data: owner, error: eO } = await supabase
        .from("owners")
        .insert({
          name: args.client_name,
          phone: args.client_phone ?? null,
          email: args.client_email ?? null,
          organization_id: prof.organization_id,
        })
        .select("id")
        .maybeSingle();
      if (eO) return fail(`Error creando propietario: ${eO.message}`);
      owner_id = owner?.id ?? null;
    }

    const tasks = (args.client_tasks ?? []).map((t) => ({ text: t, done: false }));

    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        plate: args.plate.toUpperCase(),
        brand: args.brand,
        model: args.model,
        year: args.year ?? null,
        color: args.color ?? null,
        vin: args.vin ?? null,
        mileage: args.mileage ?? null,
        client_description: args.client_description ?? null,
        client_tasks: tasks,
        priority: args.priority ?? "normal",
        assigned_to: args.assigned_to ?? null,
        owner_id,
        status: "recibido",
        organization_id: prof.organization_id,
        created_by: ctx.getUserId(),
        reception_date: new Date().toISOString(),
      })
      .select()
      .maybeSingle();
    if (error) return fail(error.message);
    return ok(data, "vehicle");
  },
});
