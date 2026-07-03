import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

export function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function unauth() {
  return { content: [{ type: "text" as const, text: "No autenticado" }], isError: true };
}

export function ok(data: unknown, key = "result") {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: { [key]: data } as Record<string, unknown>,
  };
}

export function fail(msg: string) {
  return { content: [{ type: "text" as const, text: msg }], isError: true };
}

export const VEHICLE_STATUSES = [
  "recibido",
  "presupuestar",
  "presupuestado",
  "en_reparacion",
  "pendiente_piezas",
  "terminado",
  "facturado",
  "entregado",
] as const;

export const PRIORITIES = ["baja", "normal", "alta", "urgente"] as const;
export const APPOINTMENT_TYPES = ["mecanica", "chapa_pintura"] as const;
