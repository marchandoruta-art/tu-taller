import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_WHATSAPP_MESSAGE = `Estimado cliente,

Le comunicamos que las labores de reparación correspondientes a su vehículo {marca} {modelo}, con matrícula *{matricula}*, han sido finalizadas satisfactoriamente.

Su vehículo se encuentra a su disposición en nuestras instalaciones, pudiendo proceder a su recogida dentro del horario habitual de atención.

— Datos de contacto —
Taller: *{nombre_taller}*
Horario: {horario}
Teléfono: {telefono}
WhatsApp: {whatsapp_num}

Le rogamos confirme la fecha y hora de recogida con la mayor antelación posible.

Agradecemos sinceramente la confianza depositada en nuestro equipo.

Reciba un cordial saludo,
*{nombre_taller}*`;

export function useWhatsAppMessage() {
  const [template, setTemplate] = useState(DEFAULT_WHATSAPP_MESSAGE);
  const [contactSettings, setContactSettings] = useState({
    telefono: '971 322 883',
    whatsapp: '689 907 343',
    horario: 'Lunes a viernes: 8:00 – 16:00 h',
    nombreTaller: 'Taller',
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data, error } = await supabase.rpc('get_workshop_contact_settings');

        if (error) throw error;

        const workshopData = data?.[0];

        if (workshopData?.whatsapp_message) {
          setTemplate(workshopData.whatsapp_message);
        }

        setContactSettings({
          telefono: workshopData?.telefono || '971 322 883',
          whatsapp: workshopData?.whatsapp || '689 907 343',
          horario: workshopData?.horario || 'Lunes a viernes: 8:00 – 16:00 h',
          nombreTaller: workshopData?.nombre_taller || 'Taller',
        });
      } catch (error) {
        console.error('Error fetching workshop contact settings:', error);
      } finally {
        setLoaded(true);
      }
    };

    fetchAll();
  }, []);

  const buildMessage = (vehicle: { plate: string; brand: string; model: string }, tallerName?: string) => {
    return template
      .replace(/{matricula}/g, vehicle.plate)
      .replace(/{marca}/g, vehicle.brand)
      .replace(/{modelo}/g, vehicle.model)
      .replace(/{nombre_taller}/g, tallerName || contactSettings.nombreTaller)
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
