import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { vehicle_id, symptoms, extra_context } = await req.json();
    if (!vehicle_id || !symptoms || typeof symptoms !== "string" || symptoms.length > 2000) {
      return new Response(JSON.stringify({ error: "Datos inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .select("plate, brand, model, year, vin, mileage, fuel_level")
      .eq("id", vehicle_id)
      .single();

    if (vErr || !vehicle) {
      return new Response(JSON.stringify({ error: "Vehículo no encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Eres un mecánico jefe con más de 30 años de experiencia, especialista en diagnóstico de averías de todas las marcas. Conoces particularidades y averías típicas de cada modelo, boletines técnicos, códigos DTC habituales y patrones de fallo por kilometraje.

Tu tarea: a partir de los síntomas descritos, elaborar un DIAGNÓSTICO ESTRUCTURADO que ayude al mecánico a orientar la inspección. NO afirmas nada con certeza absoluta: das probabilidades realistas, ordenadas de más a menos probable.

Sé práctico y directo. Habla como taller, no como manual. Español de España.`;

    const userPrompt = `VEHÍCULO:
- ${vehicle.brand} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ''}
- Matrícula: ${vehicle.plate}
${vehicle.vin ? `- VIN: ${vehicle.vin}` : ''}
${vehicle.mileage ? `- Km: ${vehicle.mileage.toLocaleString('es-ES')}` : ''}

SÍNTOMAS REPORTADOS:
"${symptoms}"

${extra_context ? `CONTEXTO ADICIONAL:\n${extra_context}\n` : ''}
Elabora el diagnóstico estructurado.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "diagnostic_report",
            description: "Diagnóstico estructurado de la avería",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "Resumen del diagnóstico en 1-2 frases" },
                probable_causes: {
                  type: "array",
                  description: "Causas probables ordenadas de más a menos probable, máx 5",
                  items: {
                    type: "object",
                    properties: {
                      cause: { type: "string", description: "Causa concreta" },
                      probability: { type: "string", enum: ["alta", "media", "baja"] },
                      why: { type: "string", description: "Por qué es probable en este vehículo/síntoma" },
                    },
                    required: ["cause", "probability", "why"],
                  },
                },
                diagnostic_steps: {
                  type: "array",
                  description: "Pasos concretos de inspección en el orden en que hacerlos, máx 8",
                  items: { type: "string" },
                },
                required_tools: {
                  type: "array",
                  description: "Herramientas/equipos necesarios para el diagnóstico",
                  items: { type: "string" },
                },
                parts_likely_needed: {
                  type: "array",
                  description: "Piezas que probablemente haya que sustituir según causa más probable, máx 6",
                  items: { type: "string" },
                },
                dtc_codes_to_check: {
                  type: "array",
                  description: "Códigos DTC habituales relacionados con estos síntomas",
                  items: { type: "string" },
                },
                safety_warnings: {
                  type: "array",
                  description: "Advertencias de seguridad relevantes",
                  items: { type: "string" },
                },
                confidence: { type: "string", enum: ["baja", "media", "alta"] },
                notes: { type: "string", description: "Nota final del perito" },
              },
              required: ["summary", "probable_causes", "diagnostic_steps", "confidence"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "diagnostic_report" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas peticiones, inténtalo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Sin créditos de IA. Añade créditos al workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Error de IA", detail: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    let diagnostic: unknown = null;
    try {
      diagnostic = typeof args === "string" ? JSON.parse(args) : args;
    } catch {
      diagnostic = null;
    }
    if (!diagnostic) {
      return new Response(JSON.stringify({ error: "La IA no devolvió un diagnóstico válido" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ diagnostic }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
