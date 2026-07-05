import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

export function supabaseForUser(ctx: ToolContext) {
  // In Supabase Edge Functions only SUPABASE_URL / SUPABASE_ANON_KEY /
  // SUPABASE_SERVICE_ROLE_KEY are injected by default. Custom SUPABASE_* secrets
  // are filtered out, so we must use SUPABASE_ANON_KEY here.
  const url = process.env.SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    "";
  return createClient(url, key, {
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
