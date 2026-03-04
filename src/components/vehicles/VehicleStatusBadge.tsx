import { VehicleStatus, STATUS_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

interface VehicleStatusBadgeProps {
  status: VehicleStatus;
  className?: string;
}

export function VehicleStatusBadge({ status, className }: VehicleStatusBadgeProps) {
  const statusStyles: Record<VehicleStatus, string> = {
    recibido: 'status-received',
    en_reparacion: 'status-in-progress',
    pendiente_piezas: 'status-pending-parts',
    terminado: 'status-completed',
    facturado: 'status-invoiced',
    entregado: 'status-delivered',
  };

  return (
    <span className={cn('status-badge', statusStyles[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  );
}
