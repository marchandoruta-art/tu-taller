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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { vehicle_id, anomaly_description } = body;

    if (!vehicle_id || !anomaly_description || typeof anomaly_description !== "string" || anomaly_description.length > 1000) {
      return new Response(JSON.stringify({ error: "Datos inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get vehicle (RLS applies)
    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .select("plate, brand, model, year, vin, organization_id")
      .eq("id", vehicle_id)
      .single();

    if (vErr || !vehicle) {
      return new Response(JSON.stringify({ error: "Vehículo no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Eres un perito mecánico experto en automoción con conocimiento profundo de tiempos baremo de fabricantes (Audatex, GT Estimate, tiempos oficiales de marca) y de la mecánica concreta de cada modelo.

Tu tarea: estimar el tiempo de reparación basándote EXCLUSIVAMENTE en tu conocimiento técnico del vehículo concreto (marca, modelo, año, motorización típica, accesibilidad de componentes, particularidades conocidas del modelo, tiempos baremo habituales del fabricante).

Devuelves SIEMPRE JSON estructurado. Rangos realistas (ni inflados ni cortos). Si la anomalía es ambigua, amplía el rango y baja la confianza.`;

    const userPrompt = `VEHÍCULO:
- Matrícula: ${vehicle.plate}
- Marca/Modelo: ${vehicle.brand} ${vehicle.model}
- Año: ${vehicle.year || 'no especificado'}
${vehicle.vin ? `- VIN: ${vehicle.vin}` : ''}

ANOMALÍA REPORTADA: "${anomaly_description}"

Aplica tu conocimiento técnico del modelo concreto (accesibilidad, particularidades, tiempos baremo habituales) para estimar tiempo, dificultad y operaciones probables.`;

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
            name: "repair_estimate",
            description: "Estimación estructurada de la reparación",
            parameters: {
              type: "object",
              properties: {
                min_hours: { type: "number", description: "Tiempo mínimo estimado en horas" },
                max_hours: { type: "number", description: "Tiempo máximo estimado en horas" },
                difficulty: { type: "string", enum: ["baja", "media", "alta"] },
                operations: { type: "array", items: { type: "string" }, description: "Operaciones probables, máx 5" },
                possible_complications: { type: "array", items: { type: "string" }, description: "Posibles complicaciones a vigilar, máx 3" },
                confidence: { type: "string", enum: ["baja", "media", "alta"], description: "Confianza en la estimación" },
                notes: { type: "string", description: "Nota breve adicional, máx 200 caracteres" },
              },
              required: ["min_hours", "max_hours", "difficulty", "operations", "possible_complications", "confidence", "notes"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "repair_estimate" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas peticiones. Inténtalo en un momento." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Sin créditos de IA. Añade créditos en Ajustes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const txt = await aiResponse.text();
      console.error("AI error:", aiResponse.status, txt);
      return new Response(JSON.stringify({ error: "Error en el servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Respuesta IA inválida" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const estimate = JSON.parse(toolCall.function.arguments);
    const usedHistory = historicalContext.length > 0;

    return new Response(JSON.stringify({ estimate, used_workshop_history: usedHistory }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("estimate-repair-time error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
