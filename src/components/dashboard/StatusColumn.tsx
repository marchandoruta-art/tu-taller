import { ReactNode } from 'react';
import { VehicleStatus, STATUS_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusColumnProps {
  status: VehicleStatus;
  count: number;
  children: ReactNode;
}

const statusColors: Record<VehicleStatus, string> = {
  recibido: 'border-t-muted-foreground',
  en_reparacion: 'border-t-status-in-progress',
  pendiente_piezas: 'border-t-status-pending-parts',
  terminado: 'border-t-status-completed',
  entregado: 'border-t-status-delivered',
};

export function StatusColumn({ status, count, children }: StatusColumnProps) {
  return (
    <div className="flex flex-col min-w-[320px] max-w-[360px]">
      <div
        className={cn(
          'bg-card rounded-t-xl border border-b-0 border-border px-4 py-3 border-t-4',
          statusColors[status]
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{STATUS_LABELS[status]}</h3>
          <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-1 rounded-full">
            {count}
          </span>
        </div>
      </div>
      <div className="flex-1 bg-muted/30 rounded-b-xl border border-t-0 border-border p-3 space-y-3 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}
