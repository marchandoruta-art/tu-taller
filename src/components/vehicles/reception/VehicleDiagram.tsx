import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExteriorDamage {
  id: string;
  zone: string;
  description: string;
  x?: number;
  y?: number;
}

interface VehicleDiagramProps {
  damages: ExteriorDamage[];
  onChange: (damages: ExteriorDamage[]) => void;
}

const VEHICLE_ZONES = [
  { id: 'front_bumper', label: 'Parachoques delantero' },
  { id: 'rear_bumper', label: 'Parachoques trasero' },
  { id: 'front_left_fender', label: 'Aleta delantera izquierda' },
  { id: 'front_right_fender', label: 'Aleta delantera derecha' },
  { id: 'rear_left_fender', label: 'Aleta trasera izquierda' },
  { id: 'rear_right_fender', label: 'Aleta trasera derecha' },
  { id: 'left_door_front', label: 'Puerta delantera izquierda' },
  { id: 'left_door_rear', label: 'Puerta trasera izquierda' },
  { id: 'right_door_front', label: 'Puerta delantera derecha' },
  { id: 'right_door_rear', label: 'Puerta trasera derecha' },
  { id: 'hood', label: 'Capó' },
  { id: 'trunk', label: 'Maletero' },
  { id: 'roof', label: 'Techo' },
  { id: 'windshield', label: 'Parabrisas' },
  { id: 'rear_window', label: 'Luneta trasera' },
  { id: 'left_mirror', label: 'Retrovisor izquierdo' },
  { id: 'right_mirror', label: 'Retrovisor derecho' },
  { id: 'wheel_fl', label: 'Rueda delantera izquierda' },
  { id: 'wheel_fr', label: 'Rueda delantera derecha' },
  { id: 'wheel_rl', label: 'Rueda trasera izquierda' },
  { id: 'wheel_rr', label: 'Rueda trasera derecha' },
];

export function VehicleDiagram({ damages, onChange }: VehicleDiagramProps) {
  const [newDamage, setNewDamage] = useState({ zone: '', description: '' });
  const [showForm, setShowForm] = useState(false);

  const addDamage = () => {
    if (!newDamage.zone || !newDamage.description) return;
    
    const damage: ExteriorDamage = {
      id: crypto.randomUUID(),
      zone: newDamage.zone,
      description: newDamage.description,
    };
    
    onChange([...damages, damage]);
    setNewDamage({ zone: '', description: '' });
    setShowForm(false);
  };

  const removeDamage = (id: string) => {
    onChange(damages.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Daños Exteriores</Label>
        {!showForm && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Añadir daño
          </Button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="damage-zone">Zona del vehículo</Label>
            <select
              id="damage-zone"
              value={newDamage.zone}
              onChange={(e) => setNewDamage({ ...newDamage, zone: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">Seleccionar zona...</option>
              {VEHICLE_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="damage-description">Descripción del daño</Label>
            <Input
              id="damage-description"
              value={newDamage.description}
              onChange={(e) => setNewDamage({ ...newDamage, description: e.target.value })}
              placeholder="Ej: Arañazo de 10cm, abolladuras, pintura descascarillada..."
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={addDamage} disabled={!newDamage.zone || !newDamage.description}>
              Añadir
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {damages.length > 0 && (
        <div className="space-y-2">
          {damages.map((damage) => {
            const zone = VEHICLE_ZONES.find(z => z.id === damage.zone);
            return (
              <div
                key={damage.id}
                className={cn(
                  'flex items-start justify-between gap-2 p-3 rounded-lg',
                  'bg-destructive/10 border border-destructive/20'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{zone?.label || damage.zone}</p>
                  <p className="text-sm text-muted-foreground truncate">{damage.description}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={() => removeDamage(damage.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {damages.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No se han registrado daños exteriores
        </p>
      )}
    </div>
  );
}
