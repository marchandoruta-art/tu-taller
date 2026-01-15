import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Camera, Image, Loader2, AlertTriangle } from 'lucide-react';
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

interface VehicleZone {
  id: string;
  label: string;
  path: string;
}

// SVG paths for each zone of the vehicle (top-down view)
const VEHICLE_ZONES: VehicleZone[] = [
  { id: 'hood', label: 'Capó', path: 'M 80 40 L 170 40 L 180 80 L 70 80 Z' },
  { id: 'windshield', label: 'Parabrisas', path: 'M 70 80 L 180 80 L 185 100 L 65 100 Z' },
  { id: 'roof', label: 'Techo', path: 'M 65 100 L 185 100 L 185 180 L 65 180 Z' },
  { id: 'rear_window', label: 'Luneta trasera', path: 'M 65 180 L 185 180 L 180 200 L 70 200 Z' },
  { id: 'trunk', label: 'Maletero', path: 'M 70 200 L 180 200 L 170 240 L 80 240 Z' },
  { id: 'front_bumper', label: 'Parachoques delantero', path: 'M 70 25 L 180 25 L 180 40 L 70 40 Z' },
  { id: 'rear_bumper', label: 'Parachoques trasero', path: 'M 70 240 L 180 240 L 180 255 L 70 255 Z' },
  { id: 'front_left_fender', label: 'Aleta delantera izquierda', path: 'M 40 40 L 70 40 L 70 90 L 40 85 Z' },
  { id: 'front_right_fender', label: 'Aleta delantera derecha', path: 'M 180 40 L 210 40 L 210 85 L 180 90 Z' },
  { id: 'left_door_front', label: 'Puerta delantera izquierda', path: 'M 40 90 L 65 90 L 65 145 L 40 145 Z' },
  { id: 'left_door_rear', label: 'Puerta trasera izquierda', path: 'M 40 145 L 65 145 L 65 190 L 40 190 Z' },
  { id: 'right_door_front', label: 'Puerta delantera derecha', path: 'M 185 90 L 210 90 L 210 145 L 185 145 Z' },
  { id: 'right_door_rear', label: 'Puerta trasera derecha', path: 'M 185 145 L 210 145 L 210 190 L 185 190 Z' },
  { id: 'rear_left_fender', label: 'Aleta trasera izquierda', path: 'M 40 190 L 65 190 L 70 240 L 40 235 Z' },
  { id: 'rear_right_fender', label: 'Aleta trasera derecha', path: 'M 185 190 L 210 190 L 210 235 L 180 240 Z' },
  { id: 'left_mirror', label: 'Retrovisor izquierdo', path: 'M 30 85 L 40 80 L 40 95 L 30 95 Z' },
  { id: 'right_mirror', label: 'Retrovisor derecho', path: 'M 210 80 L 220 85 L 220 95 L 210 95 Z' },
  { id: 'wheel_fl', label: 'Rueda delantera izquierda', path: 'M 25 55 A 12 18 0 1 1 25 55.01 Z' },
  { id: 'wheel_fr', label: 'Rueda delantera derecha', path: 'M 225 55 A 12 18 0 1 1 225 55.01 Z' },
  { id: 'wheel_rl', label: 'Rueda trasera izquierda', path: 'M 25 215 A 12 18 0 1 1 25 215.01 Z' },
  { id: 'wheel_rr', label: 'Rueda trasera derecha', path: 'M 225 215 A 12 18 0 1 1 225 215.01 Z' },
];

export function VehicleDiagram({ damages, onChange }: VehicleDiagramProps) {
  const [selectedZone, setSelectedZone] = useState<VehicleZone | null>(null);
  const [newDamage, setNewDamage] = useState({ description: '', photos: [] as string[] });
  const [uploading, setUploading] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
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
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removePhoto = (photoUrl: string) => {
    setNewDamage(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p !== photoUrl)
    }));
  };

  const handleZoneClick = (zone: VehicleZone) => {
    setSelectedZone(zone);
    setNewDamage({ description: '', photos: [] });
  };

  const addDamage = () => {
    if (!selectedZone || !newDamage.description) return;
    
    const damage: ExteriorDamage = {
      id: crypto.randomUUID(),
      zone: selectedZone.id,
      description: newDamage.description,
      photos: newDamage.photos.length > 0 ? newDamage.photos : undefined,
    };
    
    onChange([...damages, damage]);
    setNewDamage({ description: '', photos: [] });
    setSelectedZone(null);
  };

  const removeDamage = (id: string) => {
    onChange(damages.filter(d => d.id !== id));
  };

  const getZoneDamageCount = (zoneId: string) => {
    return damages.filter(d => d.zone === zoneId).length;
  };

  const getZoneColor = (zone: VehicleZone) => {
    const damageCount = getZoneDamageCount(zone.id);
    if (damageCount > 0) return 'hsl(var(--destructive))';
    if (hoveredZone === zone.id) return 'hsl(var(--primary) / 0.6)';
    if (selectedZone?.id === zone.id) return 'hsl(var(--primary))';
    return 'hsl(var(--muted))';
  };

  const getZoneStroke = (zone: VehicleZone) => {
    const damageCount = getZoneDamageCount(zone.id);
    if (damageCount > 0) return 'hsl(var(--destructive))';
    if (selectedZone?.id === zone.id) return 'hsl(var(--primary))';
    return 'hsl(var(--border))';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Daños Exteriores</Label>
        <span className="text-xs text-muted-foreground">Toca una zona para marcar daños</span>
      </div>

      {/* Interactive Vehicle Diagram */}
      <div className="relative bg-muted/20 rounded-lg p-4 border">
        <svg
          viewBox="0 0 250 280"
          className="w-full max-w-[300px] mx-auto h-auto cursor-pointer"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Vehicle body outline for context */}
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
          </defs>
          
          {/* Background shape */}
          <path
            d="M 70 25 Q 125 15 180 25 L 210 40 L 220 75 L 225 215 L 210 240 L 180 255 Q 125 265 70 255 L 40 240 L 25 215 L 30 75 L 40 40 Z"
            fill="hsl(var(--background))"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            filter="url(#shadow)"
          />

          {/* Interactive zones */}
          {VEHICLE_ZONES.map((zone) => {
            const damageCount = getZoneDamageCount(zone.id);
            return (
              <g key={zone.id}>
                <path
                  d={zone.path}
                  fill={getZoneColor(zone)}
                  stroke={getZoneStroke(zone)}
                  strokeWidth={selectedZone?.id === zone.id || damageCount > 0 ? 2 : 1}
                  className="transition-all duration-200 cursor-pointer"
                  onClick={() => handleZoneClick(zone)}
                  onMouseEnter={() => setHoveredZone(zone.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                  style={{ opacity: damageCount > 0 ? 0.8 : hoveredZone === zone.id ? 0.7 : 0.5 }}
                />
                {/* Damage indicator */}
                {damageCount > 0 && (
                  <g>
                    <circle
                      cx={zone.id.includes('left') ? 50 : zone.id.includes('right') ? 200 : 125}
                      cy={
                        zone.id.includes('front') || zone.id === 'hood' || zone.id === 'windshield' ? 70 :
                        zone.id.includes('rear') || zone.id === 'trunk' ? 220 : 140
                      }
                      r="8"
                      fill="hsl(var(--destructive))"
                      stroke="hsl(var(--background))"
                      strokeWidth="2"
                    />
                    <text
                      x={zone.id.includes('left') ? 50 : zone.id.includes('right') ? 200 : 125}
                      y={
                        (zone.id.includes('front') || zone.id === 'hood' || zone.id === 'windshield' ? 70 :
                        zone.id.includes('rear') || zone.id === 'trunk' ? 220 : 140) + 4
                      }
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="hsl(var(--destructive-foreground))"
                    >
                      {damageCount}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Front indicator */}
          <text x="125" y="18" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
            FRONTAL
          </text>
          
          {/* Rear indicator */}
          <text x="125" y="272" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
            TRASERO
          </text>
        </svg>

        {/* Zone label on hover/select */}
        {(hoveredZone || selectedZone) && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/95 px-3 py-1 rounded-full text-xs font-medium border shadow-sm">
            {VEHICLE_ZONES.find(z => z.id === (selectedZone?.id || hoveredZone))?.label}
          </div>
        )}
      </div>

      {/* Damage Form when zone is selected */}
      {selectedZone && (
        <div className="space-y-3 p-3 border rounded-lg bg-primary/5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{selectedZone.label}</span>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="damage-description">Descripción del daño</Label>
            <Input
              id="damage-description"
              value={newDamage.description}
              onChange={(e) => setNewDamage({ ...newDamage, description: e.target.value })}
              placeholder="Ej: Arañazo de 10cm, abolladura, pintura descascarillada..."
              autoFocus
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
            <Button type="button" size="sm" onClick={addDamage} disabled={!newDamage.description || uploading}>
              Añadir daño
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedZone(null); setNewDamage({ description: '', photos: [] }); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Damage List */}
      {damages.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Daños registrados ({damages.length})</Label>
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
                    <p className="font-medium text-sm flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                      {zone?.label || damage.zone}
                    </p>
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

      {damages.length === 0 && !selectedZone && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No se han registrado daños exteriores
        </p>
      )}
    </div>
  );
}
