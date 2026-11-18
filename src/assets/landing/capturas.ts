// Capturas reales de la app con los datos personales pixelados
// (hechas con la cuenta de administración sobre el taller real, 2026-11-18).
import tablon from './tablon.webp';
import vehiculo from './vehiculo.webp';
import jornada from './jornada.webp';
import cita from './cita.webp';

export type ClaveCaptura = 'tablon' | 'vehiculo' | 'jornada' | 'cita';

export const capturas: Partial<Record<ClaveCaptura, string>> = { tablon, vehiculo, jornada, cita };
