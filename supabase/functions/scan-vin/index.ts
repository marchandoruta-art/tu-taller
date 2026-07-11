import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const SYSTEM_PROMPT = `Eres un experto en identificar el número de bastidor (VIN) de un vehículo. Se te enviará una foto de una etiqueta VIN, placa metálica, parabrisas o pilar B/puerta.
Extrae SOLO el VIN (17 caracteres alfanuméricos, sin las letras I, O, Q). Devuelve un JSON:
{
  "vin": "VIN 17 caracteres en mayúsculas o null",
  "brand": "marca deducida si es reconocible por el WMI, en mayúsculas, o null",
  "year": año 4 dígitos deducido del 10º carácter si aparece claro, o null
}
Si no puedes leer 17 caracteres válidos con seguridad, devuelve vin: null.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY no configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'Falta imageBase64' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mime = typeof mimeType === 'string' && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
    const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:${mime};base64,${imageBase64}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: [
            { type: 'text', text: 'Extrae el VIN. Devuelve JSON.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ]},
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429) return new Response(JSON.stringify({ error: 'Demasiadas peticiones' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (res.status === 402) return new Response(JSON.stringify({ error: 'Sin créditos de IA' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: 'Error de IA', detail: errText }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try { parsed = typeof content === 'string' ? JSON.parse(content) : content; } catch { parsed = {}; }

    const clean = (v: any) => (typeof v === 'string' ? v.trim() : v) || null;
    let vin = clean(parsed.vin)?.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    if (vin && vin.length !== 17) vin = null;

    return new Response(JSON.stringify({
      vin: vin || null,
      brand: clean(parsed.brand)?.toUpperCase() ?? null,
      year: Number.isInteger(parsed.year) && parsed.year > 1980 && parsed.year < 2100 ? parsed.year : null,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
