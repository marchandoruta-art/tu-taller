import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Camera, Image, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExteriorDamage {
  id: string;
  zone: string;
  description: string;
  x?: number;
  y?: number;
  photos?: string[];
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
  const [newDamage, setNewDamage] = useState({ zone: '', description: '', photos: [] as string[] });
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `damage-${crypto.randomUUID()}.${fileExt}`;
      const filePath = `damages/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('vehicle-files')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error al subir la foto');
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newPhotos: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const url = await uploadPhoto(files[i]);
      if (url) newPhotos.push(url);
    }

    setNewDamage(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
    setUploading(false);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removePhoto = (photoUrl: string) => {
    setNewDamage(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p !== photoUrl)
    }));
  };

  const addDamage = () => {
    if (!newDamage.zone || !newDamage.description) return;
    
    const damage: ExteriorDamage = {
      id: crypto.randomUUID(),
      zone: newDamage.zone,
      description: newDamage.description,
      photos: newDamage.photos.length > 0 ? newDamage.photos : undefined,
    };
    
    onChange([...damages, damage]);
    setNewDamage({ zone: '', description: '', photos: [] });
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

          {/* Photo Upload Section */}
          <div className="space-y-2">
            <Label>Fotos del daño (opcional)</Label>
            <div className="flex gap-2">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
                Cámara
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Image className="h-4 w-4 mr-1" />
                Galería
              </Button>
            </div>

            {/* Photo Preview */}
            {newDamage.photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newDamage.photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Daño ${index + 1}`}
                      className="h-16 w-16 object-cover rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={addDamage} disabled={!newDamage.zone || !newDamage.description || uploading}>
              Añadir
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setNewDamage({ zone: '', description: '', photos: [] }); }}>
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
                  'flex flex-col gap-2 p-3 rounded-lg',
                  'bg-destructive/10 border border-destructive/20'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{zone?.label || damage.zone}</p>
                    <p className="text-sm text-muted-foreground">{damage.description}</p>
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
                {damage.photos && damage.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {damage.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Daño ${index + 1}`}
                        className="h-12 w-12 object-cover rounded-md border cursor-pointer hover:opacity-80"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    ))}
                  </div>
                )}
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
