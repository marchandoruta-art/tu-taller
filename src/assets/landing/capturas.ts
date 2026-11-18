/**
 * Capturas reales de la app para la landing.
 *
 * Se generan con `scratchpad/capturas/capturar-app.mjs` entrando en un taller
 * DEMO con datos ficticios. Mientras una captura no exista, la landing enseña
 * un bloque gris marcado como pendiente: nunca una imagen inventada.
 */
export type ClaveCaptura = 'tablon' | 'vehiculo' | 'jornada' | 'cita';

export const capturas: Partial<Record<ClaveCaptura, string>> = {};
