import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScanLine, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  onScanned: (data: { vin: string | null; brand: string | null; year: number | null }) => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  label?: string;
}

async function compressImage(file: File, maxSize = 1600, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
}

export function ScanVinButton({ onScanned, variant = 'outline', size = 'default', className, label = 'Escanear VIN' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const { base64, mimeType } = await compressImage(file);
      const { data, error } = await supabase.functions.invoke('scan-vin', {
        body: { imageBase64: base64, mimeType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.vin) {
        toast.warning('No se pudo leer el VIN', { description: 'Enfoca bien la etiqueta y asegura buena luz.' });
      } else {
        toast.success('VIN detectado', { description: data.vin });
        onScanned(data);
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
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <Button type="button" variant={variant} size={size} className={className} disabled={loading}
        onClick={() => inputRef.current?.click()}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        {label}
      </Button>
    </>
  );
}
