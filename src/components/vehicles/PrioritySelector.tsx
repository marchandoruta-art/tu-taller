import { useState } from 'react';
import { VehiclePriority, PRIORITY_LABELS } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Flame, Zap, ChevronDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PrioritySelectorProps {
  vehicleId: string;
  value: VehiclePriority;
  canEdit?: boolean;
  size?: 'sm' | 'md';
  onChanged?: (next: VehiclePriority) => void;
}

const PRIORITY_STYLES: Record<VehiclePriority, { className: string; icon: any }> = {
  urgente: { className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse', icon: Flame },
  alta: { className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30', icon: Zap },
  normal: { className: 'bg-muted text-muted-foreground border-border', icon: ChevronDown },
  baja: { className: 'bg-muted/50 text-muted-foreground border-border', icon: Minus },
};

export function PriorityBadge({ value, className }: { value: VehiclePriority; className?: string }) {
  const cfg = PRIORITY_STYLES[value];
  const Icon = cfg.icon;
  if (value === 'normal') return null;
  return (
    <Badge variant="outline" className={cn('gap-1 text-xs', cfg.className, className)}>
      <Icon className="h-3 w-3" />
      {PRIORITY_LABELS[value]}
    </Badge>
  );
}

export function PrioritySelector({ vehicleId, value, canEdit = true, size = 'sm', onChanged }: PrioritySelectorProps) {
  const [updating, setUpdating] = useState(false);

  if (!canEdit) {
    return <PriorityBadge value={value} />;
  }

  const handleChange = async (next: VehiclePriority) => {
    setUpdating(true);
    const { error } = await supabase
      .from('vehicles')
      .update({ priority: next })
      .eq('id', vehicleId);
    setUpdating(false);
    if (error) {
      toast.error('Error al cambiar prioridad');
    } else {
      onChanged?.(next);
      toast.success(`Prioridad: ${PRIORITY_LABELS[next]}`);
    }
  };

  const cfg = PRIORITY_STYLES[value];
  const Icon = cfg.icon;

  return (
    <Select value={value} disabled={updating} onValueChange={(v) => handleChange(v as VehiclePriority)}>
      <SelectTrigger
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          'gap-1 border',
          cfg.className,
          size === 'sm' ? 'h-7 text-xs px-2' : 'h-9 text-sm px-3',
        )}
      >
        <Icon className="h-3 w-3" />
        <SelectValue placeholder="Prioridad" />
      </SelectTrigger>
      <SelectContent>
        {(['urgente', 'alta', 'normal', 'baja'] as VehiclePriority[]).map((p) => {
          const PIcon = PRIORITY_STYLES[p].icon;
          return (
            <SelectItem key={p} value={p}>
              <span className="flex items-center gap-2">
                <PIcon className="h-3.5 w-3.5" />
                {PRIORITY_LABELS[p]}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
