import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Si la cuenta que ha entrado gobierna la aplicacion por encima de los talleres.
 *
 * No se deduce del rol: un admin lo es de SU taller. El propietario de la
 * aplicacion es otra cosa, y vive en su propia tabla.
 */
export function usePropietarioPlataforma() {
  const { user, loading: cargandoSesion } = useAuth();
  const [esPropietario, setEsPropietario] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;

    if (cargandoSesion) return;
    if (!user) {
      setEsPropietario(false);
      setCargando(false);
      return;
    }

    (async () => {
      const { data } = await supabase.rpc('es_propietario_plataforma' as never);
      if (!vigente) return;
      setEsPropietario(data === true);
      setCargando(false);
    })();

    return () => { vigente = false; };
  }, [user, cargandoSesion]);

  return { esPropietario, cargando };
}
