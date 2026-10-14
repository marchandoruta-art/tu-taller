/**
 * Cabecera identificativa del taller para los documentos que se entregan al
 * cliente.
 *
 * El recibo de deposito acredita en que estado se recibio el vehiculo y quien
 * lo custodia, asi que tiene que llevar los datos del taller que lo emite. Iban
 * escritos dentro del codigo, lo que significaba que cualquier otro taller que
 * usara la aplicacion entregaria documentos con una empresa que no es la suya.
 */
export interface DatosTaller {
  name?: string | null;
  razon_social?: string | null;
  nif?: string | null;
  direccion?: string | null;
  codigo_postal?: string | null;
  poblacion?: string | null;
  provincia?: string | null;
  telefono?: string | null;
  email?: string | null;
}

const escapar = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Devuelve el bloque HTML de cabecera. Omite lo que el taller no haya rellenado. */
export function cabeceraTallerHTML(org: DatosTaller | null | undefined): string {
  const nombre = org?.razon_social?.trim() || org?.name?.trim() || '';

  const localidad = [org?.codigo_postal, org?.poblacion].filter(Boolean).join(' ');
  const segundaLinea = [org?.direccion, localidad, org?.provincia]
    .map((x) => x?.trim())
    .filter(Boolean)
    .join(' · ');

  const contacto = [
    org?.nif?.trim() ? `NIF: ${org.nif.trim()}` : null,
    org?.telefono?.trim(),
    org?.email?.trim(),
  ].filter(Boolean).join(' · ');

  return [
    nombre ? `<div class="company">${escapar(nombre)}</div>` : '',
    segundaLinea ? `<div class="company-info">${escapar(segundaLinea)}</div>` : '',
    contacto ? `<div class="company-info">${escapar(contacto)}</div>` : '',
  ].filter(Boolean).join('\n    ');
}

/** Estilo de las lineas de datos del taller, para meter en el <style> del documento. */
export const ESTILO_CABECERA_TALLER =
  '.company-info { font-size: 11px; color: #444; margin-top: 2px; }';
