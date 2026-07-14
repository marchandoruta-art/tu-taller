import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2, Wrench, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export interface MaintenanceItem {
  text: string;
  done: boolean;
  note?: string;
  checked_at?: string;
}

interface Props {
  vehicleId: string;
  items: MaintenanceItem[];
  onUpdate: (items: MaintenanceItem[]) => void;
}

const DEFAULT_ITEMS = [
  'Neumáticos (presión y desgaste)',
  'Frenos (pastillas y discos)',
  'Luces (cortas, largas, freno, intermitentes)',
  'Niveles (aceite, refrigerante, frenos, dirección)',
  'Rótulas y bieletas',
  'Amortiguadores',
  'Correas y mangueras',
  'Batería',
  'Filtros (aire, habitáculo)',
  'Limpiaparabrisas y escobillas',
];

export function MaintenanceChecklist({ vehicleId, items, onUpdate }: Props) {
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  const list = items;
  const doneCount = useMemo(() => list.filter((i) => i.done).length, [list]);
  const total = list.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const save = async (updated: MaintenanceItem[]) => {
    setSaving(true);
    const { error } = await supabase
      .from('vehicles')
      .update({ maintenance_checklist: JSON.parse(JSON.stringify(updated)) })
      .eq('id', vehicleId);
    setSaving(false);
    if (error) {
      toast.error('Error al guardar el checklist');
      return false;
    }
    onUpdate(updated);
    return true;
  };

  const loadDefaults = async () => {
    const existing = new Set(list.map((i) => i.text.toLowerCase().trim()));
    const additions = DEFAULT_ITEMS
      .filter((t) => !existing.has(t.toLowerCase().trim()))
      .map((text) => ({ text, done: false }));
    if (additions.length === 0) {
      toast.info('Ya están todos los ítems por defecto');
      return;
    }
    const ok = await save([...list, ...additions]);
    if (ok) toast.success(`${additions.length} ítem(s) añadidos`);
  };

  const toggle = async (i: number) => {
    const updated = list.map((it, idx) =>
      idx === i ? { ...it, done: !it.done, checked_at: !it.done ? new Date().toISOString() : undefined } : it,
    );
    await save(updated);
  };

  const updateNote = async (i: number, note: string) => {
    const updated = list.map((it, idx) => (idx === i ? { ...it, note } : it));
    await save(updated);
  };

  const remove = async (i: number) => {
    await save(list.filter((_, idx) => idx !== i));
  };

  const add = async () => {
    const text = newItem.trim();
    if (!text) return;
    const ok = await save([...list, { text, done: false }]);
    if (ok) setNewItem('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Checklist de Mantenimiento
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={loadDefaults} disabled={saving}>
              <RotateCcw className="h-3.5 w-3.5" /> Cargar por defecto
            </Button>
            {total > 0 && (
              <span className="text-sm text-muted-foreground font-medium">
                {doneCount}/{total} ({progress}%)
              </span>
            )}
          </div>
        </div>
        {total > 0 && (
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {total === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Sin ítems. Pulsa "Cargar por defecto" para añadir la lista habitual o crea los tuyos.
          </p>
        )}

        {list.map((item, index) => (
          <div
            key={index}
            className={`flex flex-col gap-1 p-2 rounded-lg transition-colors ${
              item.done ? 'bg-primary/5' : 'bg-muted/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Checkbox checked={item.done} onCheckedChange={() => toggle(index)} disabled={saving} />
              <span className={`flex-1 text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                {item.text}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
                disabled={saving}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              value={item.note || ''}
              onChange={(e) => onUpdate(list.map((it, idx) => (idx === index ? { ...it, note: e.target.value } : it)))}
              onBlur={(e) => {
                if ((e.target.value || '') !== (item.note || '')) updateNote(index, e.target.value);
              }}
              placeholder="Notas u observaciones (opcional)"
              className="h-8 text-xs ml-7"
              disabled={saving}
            />
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Añadir ítem... (Enter)"
            className="flex-1"
            disabled={saving}
          />
          <Button size="icon" variant="outline" onClick={add} disabled={saving || !newItem.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
