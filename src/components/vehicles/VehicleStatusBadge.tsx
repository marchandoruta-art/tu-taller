import { VehicleStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLabels } from '@/hooks/useLabels';

interface VehicleStatusBadgeProps {
  status: VehicleStatus;
  className?: string;
}

export function VehicleStatusBadge({ status, className }: VehicleStatusBadgeProps) {
  const labels = useLabels();

  const statusStyles: Record<VehicleStatus, string> = {
    recibido: 'status-received',
    presupuestar: 'status-to-quote',
    presupuestado: 'status-quoted',
    en_reparacion: 'status-in-progress',
    pendiente_piezas: 'status-pending-parts',
    terminado: 'status-completed',
    facturado: 'status-invoiced',
    entregado: 'status-delivered',
  };

  return (
    <span className={cn('status-badge', statusStyles[status], className)}>
      {labels.status(status)}
    </span>
  );
}
