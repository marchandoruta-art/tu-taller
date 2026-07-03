import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "generate_repair_report",
  title: "Generar informe de reparación",
  description:
    "Genera un informe estructurado completo de la reparación de un vehículo, incluyendo datos del cliente, vehículo, tareas realizadas, piezas usadas con importes, tiempo total invertido, notas y fotos. Devuelve un informe en Markdown listo para exportar a PDF, imprimir o enviar al cliente. Ideal para entrega, facturación o histórico.",
  inputSchema: {
    vehicle_id: z.string().uuid().optional(),
    plate: z.string().optional().describe("Matrícula (alternativa a vehicle_id)"),
    include_photos: z.boolean().default(false).describe("Incluir referencias a fotos"),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ vehicle_id, plate, include_photos }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    if (!vehicle_id && !plate) return fail("Debes indicar vehicle_id o plate");

    const sb = supabaseForUser(ctx);

    let q = sb
      .from("vehicles")
      .select(`
        id, plate, brand, model, status, priority, mileage, color, vin,
        client_description, work_notes, reception_notes, client_tasks,
        created_at, delivered_at, assigned_to,
        owner:owners(name, phone, email, address, nif)
      `)
      .limit(1);
    q = vehicle_id ? q.eq("id", vehicle_id) : q.eq("plate", plate!.toUpperCase());

    const { data: vehicles, error } = await q;
    if (error) return fail(error.message);
    const v = vehicles?.[0] as any;
    if (!v) return fail("Vehículo no encontrado");

    const [{ data: parts }, { data: logs }, { data: photos }, { data: settings }] = await Promise.all([
      sb.from("parts").select("name, quantity, unit_price, total_price, supplier").eq("vehicle_id", v.id),
      sb.from("time_logs").select("started_at, ended_at, total_minutes, user_id").eq("vehicle_id", v.id),
      include_photos
        ? sb.from("vehicle_photos").select("category, description, created_at").eq("vehicle_id", v.id)
        : Promise.resolve({ data: [] as any[] }),
      sb.rpc("get_workshop_contact_settings"),
    ]);

    const w = (settings as any)?.[0] ?? {};
    const totalMinutes = (logs ?? []).reduce((s: number, l: any) => s + (l.total_minutes ?? 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(2);
    const partsTotal = (parts ?? []).reduce((s: number, p: any) => s + Number(p.total_price ?? 0), 0);

    const tasks = Array.isArray(v.client_tasks) ? v.client_tasks : [];
    const doneTasks = tasks.filter((t: any) => t.done);
    const pendingTasks = tasks.filter((t: any) => !t.done);

    const fecha = new Date().toLocaleDateString("es-ES");
    const md = [
      `# Informe de Reparación`,
      ``,
      `**${w.nombre_taller ?? "Taller"}**  `,
      w.telefono ? `Tel: ${w.telefono}  ` : "",
      w.horario ? `${w.horario}  ` : "",
      ``,
      `**Fecha:** ${fecha}`,
      ``,
      `## Cliente`,
      `- **Nombre:** ${v.owner?.name ?? "—"}`,
      `- **Teléfono:** ${v.owner?.phone ?? "—"}`,
      v.owner?.email ? `- **Email:** ${v.owner.email}` : "",
      v.owner?.nif ? `- **NIF:** ${v.owner.nif}` : "",
      v.owner?.address ? `- **Dirección:** ${v.owner.address}` : "",
      ``,
      `## Vehículo`,
      `- **Matrícula:** ${v.plate}`,
      `- **Marca / Modelo:** ${v.brand} ${v.model}`,
      v.color ? `- **Color:** ${v.color}` : "",
      v.mileage ? `- **Kilómetros:** ${v.mileage}` : "",
      v.vin ? `- **Bastidor:** ${v.vin}` : "",
      `- **Estado actual:** ${v.status}`,
      `- **Entrada:** ${new Date(v.created_at).toLocaleDateString("es-ES")}`,
      v.delivered_at ? `- **Entregado:** ${new Date(v.delivered_at).toLocaleDateString("es-ES")}` : "",
      ``,
      `## Descripción del cliente`,
      v.client_description || "_Sin descripción_",
      ``,
      `## Tareas realizadas (${doneTasks.length}/${tasks.length})`,
      ...(doneTasks.length ? doneTasks.map((t: any) => `- ✅ ${t.text}`) : ["_Ninguna_"]),
      ...(pendingTasks.length ? ["", `### Pendientes`, ...pendingTasks.map((t: any) => `- ⏳ ${t.text}`)] : []),
      ``,
      `## Piezas y materiales`,
    ];

    if (parts && parts.length) {
      md.push(`| Concepto | Cant. | P. unit. | Total |`, `|---|---:|---:|---:|`);
      for (const p of parts as any[]) {
        md.push(`| ${p.name} | ${p.quantity} | ${Number(p.unit_price ?? 0).toFixed(2)} € | ${Number(p.total_price ?? 0).toFixed(2)} € |`);
      }
      md.push(`| **Total piezas** | | | **${partsTotal.toFixed(2)} €** |`);
    } else {
      md.push("_Sin piezas registradas_");
    }

    md.push(
      ``,
      `## Tiempo invertido`,
      `- **Total:** ${totalHours} h (${totalMinutes} min)`,
      `- **Sesiones de trabajo:** ${logs?.length ?? 0}`,
      ``,
    );

    if (v.reception_notes) md.push(`## Notas de recepción`, v.reception_notes, ``);
    if (v.work_notes) md.push(`## Notas de trabajo`, v.work_notes, ``);

    if (include_photos && photos && photos.length) {
      md.push(`## Fotos documentadas (${photos.length})`);
      const byCat = photos.reduce((acc: Record<string, number>, p: any) => {
        acc[p.category] = (acc[p.category] ?? 0) + 1;
        return acc;
      }, {});
      for (const [cat, n] of Object.entries(byCat)) md.push(`- **${cat}:** ${n} foto(s)`);
      md.push("");
    }

    md.push(`---`, `_Informe generado automáticamente por ${w.nombre_taller ?? "Tu Taller"}_`);

    const markdown = md.filter((l) => l !== "").join("\n").replace(/\n{3,}/g, "\n\n");

    return ok({
      vehicle_id: v.id,
      plate: v.plate,
      markdown,
      totals: {
        parts_eur: Number(partsTotal.toFixed(2)),
        time_minutes: totalMinutes,
        time_hours: Number(totalHours),
        tasks_done: doneTasks.length,
        tasks_pending: pendingTasks.length,
      },
    }, "report");
  },
});
