import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScannedVehicleData {
  plate: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  color: string | null;
  fuel: string | null;
}

interface Props {
  onScanned: (data: ScannedVehicleData) => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  label?: string;
}

// Redimensiona la imagen para reducir el tamaño enviado a la IA
async function compressImage(file: File, maxSize = 1600, quality = 0.85): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.split(',')[1];
  return { base64, mimeType: 'image/jpeg' };
}

export function ScanTechnicalSheetButton({ onScanned, variant = 'outline', size = 'default', className, label = 'Escanear ficha técnica' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const { base64, mimeType } = await compressImage(file);
      const { data, error } = await supabase.functions.invoke('scan-vehicle-document', {
        body: { imageBase64: base64, mimeType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const result = data as ScannedVehicleData;
      const filled = [result.plate, result.brand, result.model].filter(Boolean).length;
      if (filled === 0) {
        toast.warning('No se han detectado datos', {
          description: 'Asegúrate de que la imagen es un permiso de circulación o ficha técnica y está bien enfocada.',
        });
      } else {
        toast.success('Datos extraídos', { description: `${filled} campo(s) reconocidos. Revísalos antes de guardar.` });
        onScanned(result);
      }
    } catch (err: any) {
      toast.error('Error al escanear', { description: err?.message ?? 'Inténtalo de nuevo' });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        {label}
      </Button>
    </>
  );
}
