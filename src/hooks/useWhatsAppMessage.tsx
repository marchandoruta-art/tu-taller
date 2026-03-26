import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_WHATSAPP_MESSAGE = `Estimado cliente,

Le informamos de que su vehículo {matricula} ({marca} {modelo}) ya se encuentra terminado y disponible para su recogida en nuestras instalaciones.

Puede pasar a retirarlo dentro de nuestro horario habitual.

Quedamos a su disposición para cualquier aclaración.

Atentamente,
{nombre_taller}`;

export function useWhatsAppMessage() {
  const [template, setTemplate] = useState(DEFAULT_WHATSAPP_MESSAGE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'whatsapp_message')
        .maybeSingle();

      if (data?.value) setTemplate(data.value);
      setLoaded(true);
    };
    fetch();
  }, []);

  const buildMessage = (vehicle: { plate: string; brand: string; model: string }, tallerName?: string) => {
    return template
      .replace(/{matricula}/g, vehicle.plate)
      .replace(/{marca}/g, vehicle.brand)
      .replace(/{modelo}/g, vehicle.model)
      .replace(/{nombre_taller}/g, tallerName || 'Taller');
  };

  const openWhatsApp = (phone: string, vehicle: { plate: string; brand: string; model: string }, tallerName?: string) => {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const phoneWithCode = cleanPhone.startsWith('+') ? cleanPhone : `+34${cleanPhone}`;
    const message = encodeURIComponent(buildMessage(vehicle, tallerName));
    window.open(`https://wa.me/${phoneWithCode.replace('+', '')}?text=${message}`, '_blank');
  };

  return { template, openWhatsApp, loaded };
}

export { DEFAULT_WHATSAPP_MESSAGE };
