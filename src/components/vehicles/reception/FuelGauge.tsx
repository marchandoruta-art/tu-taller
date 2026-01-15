import { cn } from '@/lib/utils';
import { Fuel } from 'lucide-react';

interface FuelGaugeProps {
  value: number;
  onChange: (value: number) => void;
}

export function FuelGauge({ value, onChange }: FuelGaugeProps) {
  const levels = Array.from({ length: 8 }, (_, i) => i + 1);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Fuel className="h-4 w-4" />
        <span>Nivel de Combustible</span>
      </div>
      <div className="flex items-end gap-1 h-16 bg-muted/30 rounded-lg p-2">
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={cn(
              'flex-1 rounded-sm transition-all cursor-pointer hover:opacity-80',
              value >= level 
                ? level <= 2 
                  ? 'bg-destructive' 
                  : level <= 4 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                : 'bg-muted-foreground/20'
            )}
            style={{ height: `${(level / 8) * 100}%` }}
            aria-label={`Nivel ${level} de 8`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>E</span>
        <span>1/4</span>
        <span>1/2</span>
        <span>3/4</span>
        <span>F</span>
      </div>
    </div>
  );
}
