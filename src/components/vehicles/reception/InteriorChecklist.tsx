import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

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

const CHECKLIST_KEYS: (keyof Omit<InteriorCheckData, 'keys_count'>)[] = [
  'spare_wheel',
  'jack',
  'tools',
  'warning_triangle',
  'first_aid_kit',
  'fire_extinguisher',
  'radio',
  'navigation',
  'floor_mats',
  'antenna',
  'documents',
];

export function InteriorChecklist({ data, onChange }: InteriorChecklistProps) {
  const { t } = useTranslation();
  const handleCheck = (key: keyof Omit<InteriorCheckData, 'keys_count'>, checked: boolean) => {
    onChange({ ...data, [key]: checked });
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">{t('interiorChecklist.title')}</Label>
      
      <div className="grid grid-cols-2 gap-3">
        {CHECKLIST_KEYS.map((key) => (
          <div key={key} className="flex items-center space-x-2">
            <Checkbox
              id={key}
              checked={data[key]}
              onCheckedChange={(checked) => handleCheck(key, !!checked)}
            />
            <Label htmlFor={key} className="text-sm font-normal cursor-pointer">
              {t(`interiorChecklist.items.${key}`)}
            </Label>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Label htmlFor="keys_count" className="text-sm">{t('interiorChecklist.keysCount')}</Label>
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
