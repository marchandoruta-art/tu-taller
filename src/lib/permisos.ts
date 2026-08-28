import { UserRole } from '@/lib/types';

/**
 * Reparto de permisos acordado con el cliente el 27/08/2026.
 *
 *   admin      solo la cuenta admin@admin. Lo ve y lo toca todo.
 *   oficina    Israel e Isabela. Gestionan el taller dia a dia, pero no
 *              tocan los ajustes, ni las cuentas de la gente, ni el fichaje
 *              de la plantilla.
 *   mecanico   solo lo suyo.
 *   chapista   solo lo suyo.
 *
 * Los tres paneles reservados a admin son ajustes del taller, alta y baja de
 * usuarios, y el registro de jornada de la plantilla con sus correcciones.
 */
export function puedeGestionar(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'oficina';
}

export function esAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin';
}
