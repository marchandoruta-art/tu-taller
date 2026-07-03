import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const SYSTEM_PROMPT = `Eres un experto en identificar documentos de vehículos españoles (Permiso de Circulación, Ficha Técnica / Tarjeta ITV).
Extrae los datos del vehículo que aparecen en la imagen. Devuelve SOLO un JSON con estos campos (usa null si no aparece o no lo distingues con seguridad):
{
  "plate": "matrícula española sin espacios en mayúsculas, ej 1234ABC",
  "brand": "marca del fabricante, ej VOLKSWAGEN",
  "model": "modelo, ej GOLF 1.6 TDI",
  "year": número entero de 4 dígitos (fecha de primera matriculación),
  "vin": "número de bastidor (VIN, 17 caracteres)",
  "color": "color principal",
  "fuel": "gasolina | diesel | electrico | hibrido | glp | gnc | null"
}
No inventes datos. Si la imagen no es un documento de vehículo, devuelve todos los campos en null.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY no configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'Falta imageBase64' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mime = typeof mimeType === 'string' && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
    const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:${mime};base64,${imageBase64}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extrae los datos del vehículo de este documento. Devuelve solo JSON.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: 'Demasiadas peticiones. Inténtalo en unos segundos.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: 'Sin créditos de IA. Añade créditos al workspace.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Error de IA', detail: errText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      parsed = {};
    }

    // Normalizar
    const clean = (v: any) => (typeof v === 'string' ? v.trim() : v) || null;
    const result = {
      plate: clean(parsed.plate)?.toUpperCase().replace(/\s+/g, '') ?? null,
      brand: clean(parsed.brand)?.toUpperCase() ?? null,
      model: clean(parsed.model) ?? null,
      year: Number.isInteger(parsed.year) && parsed.year > 1950 && parsed.year < 2100 ? parsed.year : null,
      vin: clean(parsed.vin)?.toUpperCase() ?? null,
      color: clean(parsed.color) ?? null,
      fuel: clean(parsed.fuel)?.toLowerCase() ?? null,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
