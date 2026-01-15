import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface InteriorCheckData {
  spare_wheel: boolean;
  jack: boolean;
  tools: boolean;
  warning_triangle: boolean;
  first_aid_kit: boolean;
  fire_extinguisher: boolean;
  radio: boolean;
  navigation: boolean;
  floor_mats: boolean;
  antenna: boolean;
  documents: boolean;
  keys_count: number;
}

interface InteriorChecklistProps {
  data: InteriorCheckData;
  onChange: (data: InteriorCheckData) => void;
}

const CHECKLIST_ITEMS: { key: keyof Omit<InteriorCheckData, 'keys_count'>; label: string }[] = [
  { key: 'spare_wheel', label: 'Rueda de repuesto' },
  { key: 'jack', label: 'Gato' },
  { key: 'tools', label: 'Herramientas' },
  { key: 'warning_triangle', label: 'Triángulos de emergencia' },
  { key: 'first_aid_kit', label: 'Botiquín' },
  { key: 'fire_extinguisher', label: 'Extintor' },
  { key: 'radio', label: 'Radio/Navegador' },
  { key: 'navigation', label: 'Sistema navegación' },
  { key: 'floor_mats', label: 'Alfombrillas' },
  { key: 'antenna', label: 'Antena' },
  { key: 'documents', label: 'Documentación vehículo' },
];

export function InteriorChecklist({ data, onChange }: InteriorChecklistProps) {
  const handleCheck = (key: keyof Omit<InteriorCheckData, 'keys_count'>, checked: boolean) => {
    onChange({ ...data, [key]: checked });
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Comprobaciones del Interior</Label>
      
      <div className="grid grid-cols-2 gap-3">
        {CHECKLIST_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center space-x-2">
            <Checkbox
              id={item.key}
              checked={data[item.key]}
              onCheckedChange={(checked) => handleCheck(item.key, !!checked)}
            />
            <Label htmlFor={item.key} className="text-sm font-normal cursor-pointer">
              {item.label}
            </Label>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Label htmlFor="keys_count" className="text-sm">Número de llaves:</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onChange({ ...data, keys_count: num })}
              className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                data.keys_count === num
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted-foreground/20'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
