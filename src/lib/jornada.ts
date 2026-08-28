import {
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
} from 'date-fns';

/**
 * Registro de jornada. Los tipos generados de Supabase son anteriores a la
 * migracion que anadio `origen`, `motivo` y las marcas de correccion, asi que
 * la forma real de la fila se declara aqui.
 */
export interface RegistroJornada {
  id: string;
  user_id: string;
  organization_id: string | null;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number | null;
  exit_type: string | null;
  origen: string | null;
  motivo: string | null;
  corregido_en: string | null;
}

export type Periodo = 'semana' | 'mes' | 'anio';

/** Lunes a domingo, como cuenta el convenio. */
export function rangoDelPeriodo(periodo: Periodo, referencia: Date): { desde: Date; hasta: Date } {
  switch (periodo) {
    case 'semana':
      return {
        desde: startOfWeek(referencia, { weekStartsOn: 1 }),
        hasta: endOfWeek(referencia, { weekStartsOn: 1 }),
      };
    case 'mes':
      return { desde: startOfMonth(referencia), hasta: endOfMonth(referencia) };
    case 'anio':
      return { desde: startOfYear(referencia), hasta: endOfYear(referencia) };
  }
}

export function formatearDuracion(minutos: number | null | undefined): string {
  if (!minutos || minutos <= 0) return '0h 00m';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${horas}h ${String(resto).padStart(2, '0')}m`;
}

export function sumarMinutos(registros: RegistroJornada[]): number {
  return registros.reduce((total, r) => total + (r.total_minutes ?? 0), 0);
}

/**
 * Las jornadas que el sistema fabricaba antes de agosto de 2026 quedaron
 * marcadas para poder distinguirlas. No se borran: se senalan.
 */
export function esFabricado(registro: RegistroJornada): boolean {
  return registro.origen === 'automatico_historico'
    || registro.exit_type === 'auto_16h'
    || registro.exit_type === 'auto_8h';
}

export function esCorregido(registro: RegistroJornada): boolean {
  return registro.origen === 'correccion';
}

export function estaAbierto(registro: RegistroJornada): boolean {
  return registro.clock_out === null;
}

/** Clave de traduccion para la procedencia de la fila. */
export function claveOrigen(registro: RegistroJornada): string {
  if (esFabricado(registro)) return 'jornadaUI.origen.automatico';
  if (esCorregido(registro)) return 'jornadaUI.origen.correccion';
  if (estaAbierto(registro)) return 'jornadaUI.origen.abierta';
  return 'jornadaUI.origen.trabajador';
}
