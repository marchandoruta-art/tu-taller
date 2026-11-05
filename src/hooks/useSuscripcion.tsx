import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Suscripcion {
  taller: string | null;
  plan: string | null;
  plan_nombre: string | null;
  estado: string;
  prueba_termina_en: string | null;
  suscripcion_termina_en: string | null;
  dado_de_baja_en: string | null;
  tiene_acceso: boolean;
  dias_de_cortesia: number;
}

/**
 * El estado de la suscripcion del taller.
 *
 * Viene de `mi_suscripcion()`, que se salta a proposito el corte por impago:
 * si al taller se le ha cortado el acceso, no puede leer ni su propio nombre,
 * asi que hace falta una via aparte para poder explicarle que pasa.
 */
export function useSuscripcion() {
  const { user, loading: cargandoSesion } = useAuth();
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!user) { setSuscripcion(null); setCargando(false); return; }
    const { data } = await supabase.rpc('mi_suscripcion' as never);
    setSuscripcion(((data as unknown as Suscripcion[]) ?? [])[0] ?? null);
    setCargando(false);
  }, [user]);

  useEffect(() => { if (!cargandoSesion) cargar(); }, [cargandoSesion, cargar]);

  return { suscripcion, cargando, recargar: cargar };
}
