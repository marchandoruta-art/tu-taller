import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, ok, fail } from "./_shared";

export default defineTool({
  name: "identify_plate_from_image",
  title: "Identificar matrícula desde imagen",
  description:
    "Analiza una imagen (URL pública o data URL base64) para reconocer la matrícula del vehículo. Devuelve la matrícula normalizada y comprueba si ya existe un vehículo con esa matrícula en el taller.",
  inputSchema: {
    image_url: z
      .string()
      .min(1)
      .describe("URL https pública de la imagen o data URL (data:image/...;base64,...)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ image_url }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return fail("LOVABLE_API_KEY no configurada en el servidor.");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Eres un OCR de matrículas de coche. Devuelve SOLO un JSON válido con la forma: {\"plate\": \"XXXXYYY\", \"confidence\": \"high|medium|low\", \"notes\": \"...\"}. La matrícula debe ir en MAYÚSCULAS sin espacios ni guiones. Si no puedes leerla, plate = null.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Lee la matrícula de este vehículo." },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return fail(`Fallo de IA (${aiRes.status}): ${t.slice(0, 300)}`);
    }
    const aiJson: any = await aiRes.json();
    const raw: string = aiJson?.choices?.[0]?.message?.content ?? "";

    let parsed: { plate: string | null; confidence?: string; notes?: string } = { plate: null };
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      // fallback: intentar extraer con regex una matrícula española típica
      const m = raw.toUpperCase().match(/\b\d{4}\s?[A-Z]{3}\b|\b[A-Z]{1,2}\s?\d{4}\s?[A-Z]{1,3}\b/);
      parsed = { plate: m ? m[0].replace(/\s+/g, "") : null, notes: raw.slice(0, 200) };
    }

    const plate = parsed.plate ? parsed.plate.toUpperCase().replace(/[\s-]+/g, "") : null;

    let existing: any[] = [];
    if (plate) {
      const supabase = supabaseForUser(ctx);
      const { data } = await supabase
        .from("vehicles")
        .select("id, plate, brand, model, status, priority, assigned_to, archived, created_at")
        .ilike("plate", plate)
        .limit(5);
      existing = data ?? [];
    }

    return ok(
      {
        plate,
        confidence: parsed.confidence ?? null,
        notes: parsed.notes ?? null,
        existing_vehicles: existing,
        exists_in_workshop: existing.length > 0,
      },
      "identification",
    );
  },
});
