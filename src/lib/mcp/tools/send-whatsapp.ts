import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "send_whatsapp",
  title: "Generar enlace WhatsApp",
  description:
    "Genera un enlace wa.me listo para enviar por WhatsApp al cliente propietario del vehículo. Permite plantillas: 'listo' (vehículo terminado), 'presupuesto' (presupuesto listo), 'recepcion' (confirmación de recepción), o mensaje personalizado. Devuelve el enlace clicable y el texto.",
  inputSchema: {
    vehicle_id: z.string().uuid().optional().describe("ID del vehículo (o usa plate)"),
    plate: z.string().optional().describe("Matrícula del vehículo (o usa vehicle_id)"),
    template: z.enum(["listo", "presupuesto", "recepcion", "custom"]).default("listo"),
    custom_message: z.string().optional().describe("Mensaje personalizado (obligatorio si template=custom)"),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ vehicle_id, plate, template, custom_message }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    if (!vehicle_id && !plate) return fail("Debes indicar vehicle_id o plate");
    if (template === "custom" && !custom_message) return fail("custom_message obligatorio para template=custom");

    const sb = supabaseForUser(ctx);

    let q = sb
      .from("vehicles")
      .select("id, plate, brand, model, owner:owners(name, phone)")
      .limit(1);
    q = vehicle_id ? q.eq("id", vehicle_id) : q.eq("plate", plate!.toUpperCase());

    const { data: vehicles, error } = await q;
    if (error) return fail(error.message);
    const v = vehicles?.[0] as any;
    if (!v) return fail("Vehículo no encontrado");
    const phone = v.owner?.phone as string | undefined;
    if (!phone) return fail("El cliente no tiene teléfono registrado");

    // Workshop settings
    const { data: settings } = await sb.rpc("get_workshop_contact_settings");
    const w = (settings as any)?.[0] ?? {};
    const taller = w.nombre_taller ?? "el taller";

    const clientName = v.owner?.name ?? "";
    const saludo = clientName ? `Hola ${clientName},` : "Hola,";
    const veh = `${v.brand} ${v.model} (${v.plate})`;

    let message = "";
    switch (template) {
      case "listo":
        message = `${saludo} le informamos desde ${taller} que su vehículo ${veh} ya está listo para recoger. ${w.horario ? `Horario: ${w.horario}. ` : ""}${w.telefono ? `Tel: ${w.telefono}. ` : ""}Gracias.`;
        break;
      case "presupuesto":
        message = `${saludo} desde ${taller} le enviamos el presupuesto de su vehículo ${veh}. Cuando pueda, confírmenos si aprueba la reparación. Gracias.`;
        break;
      case "recepcion":
        message = `${saludo} confirmamos la recepción de su vehículo ${veh} en ${taller}. Le mantendremos informado. Gracias.`;
        break;
      case "custom":
        message = custom_message!;
        break;
    }

    const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    return ok({
      url,
      phone,
      client_name: clientName,
      vehicle: veh,
      message,
    }, "whatsapp");
  },
});
