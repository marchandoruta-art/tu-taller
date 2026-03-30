import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_WHATSAPP_MESSAGE = `Estimado cliente,

Le informamos de que las reparaciones de su vehículo *{matricula}* ({marca} {modelo}) han sido completadas satisfactoriamente.

Puede pasar a recogerlo en nuestras instalaciones en el horario indicado a continuación.

📍 *{nombre_taller}*
🕐 {horario}
📞 {telefono}
📱 {whatsapp_num}

Gracias por confiar en nosotros.
Un cordial saludo.`;

export function useWhatsAppMessage() {
  const [template, setTemplate] = useState(DEFAULT_WHATSAPP_MESSAGE);
  const [contactSettings, setContactSettings] = useState({
    telefono: '',
    whatsapp: '',
    horario: '',
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [templateRes, settingsRes] = await Promise.all([
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'whatsapp_message')
          .maybeSingle(),
        supabase
          .from('app_settings')
          .select('key, value')
          .in('key', ['taller_telefono', 'taller_whatsapp', 'taller_horario']),
      ]);

      if (templateRes.data?.value) setTemplate(templateRes.data.value);

      const s: Record<string, string> = {};
      settingsRes.data?.forEach((row) => {
        if (row.value) s[row.key] = row.value;
      });
      setContactSettings({
        telefono: s.taller_telefono || '971 322 883',
        whatsapp: s.taller_whatsapp || '689 907 343',
        horario: s.taller_horario || 'Lunes a viernes: 8:00 – 16:00 h',
      });

      setLoaded(true);
    };
    fetchAll();
  }, []);

  const buildMessage = (vehicle: { plate: string; brand: string; model: string }, tallerName?: string) => {
    return template
      .replace(/{matricula}/g, vehicle.plate)
      .replace(/{marca}/g, vehicle.brand)
      .replace(/{modelo}/g, vehicle.model)
      .replace(/{nombre_taller}/g, tallerName || 'Taller')
      .replace(/{telefono}/g, contactSettings.telefono)
      .replace(/{whatsapp_num}/g, contactSettings.whatsapp)
      .replace(/{horario}/g, contactSettings.horario);
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
