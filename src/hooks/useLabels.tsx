import { useTranslation } from 'react-i18next';
import type { VehicleStatus, VehiclePriority, UserRole } from '@/lib/types';

/**
 * Centralised label translation for domain enums.
 * DB values stay in Spanish; only the display label changes.
 */
export function useLabels() {
  const { t } = useTranslation();

  return {
    status: (status: VehicleStatus) => t(`status.${status}`),
    priority: (priority: VehiclePriority) => t(`priority.${priority}`),
    role: (role: UserRole) => t(`role.${role}`),
  };
}
