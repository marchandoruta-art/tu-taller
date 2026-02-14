import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { Camera, Upload, Trash2, Loader2, Image, X, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';

interface VehiclePhoto {
  id: string;
  vehicle_id: string;
  photo_url: string;
  photo_type: 'before' | 'during' | 'after';
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  signed_url?: string;
}

interface VehiclePhotosProps {
  vehicleId: string;
}

const PHOTO_TYPE_LABELS = {
  before: 'Antes',
  during: 'Durante',
  after: 'Después',
};

// Extract storage path from a full public URL or return as-is if already a path
function extractStoragePath(url: string, bucket: string): string {
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    return decodeURIComponent(url.substring(idx + marker.length));
  }
  return url;
}

export function VehiclePhotos({ vehicleId }: VehiclePhotosProps) {
  const { user, role } = useAuth();
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<'before' | 'during' | 'after'>('before');
  const [selectedPhoto, setSelectedPhoto] = useState<VehiclePhoto | null>(null);

  const generateSignedUrls = useCallback(async (photoList: VehiclePhoto[]) => {
    const paths = photoList.map(p => extractStoragePath(p.photo_url, 'vehicle-photos'));
    const { data } = await supabase.storage
      .from('vehicle-photos')
      .createSignedUrls(paths, 3600);

    if (data) {
      return photoList.map((photo, i) => ({
        ...photo,
        signed_url: data[i]?.signedUrl || photo.photo_url,
      }));
    }
    return photoList;
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [vehicleId]);

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from('vehicle_photos')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });

    if (data) {
      const withUrls = await generateSignedUrls(data as VehiclePhoto[]);
      setPhotos(withUrls);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'during' | 'after') => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;

    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vehicleId}/${type}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the storage path, not a public URL
      const { error: dbError } = await supabase.from('vehicle_photos').insert({
        vehicle_id: vehicleId,
        photo_url: fileName,
        photo_type: type,
        uploaded_by: user.id,
      });

      if (dbError) throw dbError;

      toast.success('Foto subida correctamente');
      fetchPhotos();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (photo: VehiclePhoto) => {
    try {
      const storagePath = extractStoragePath(photo.photo_url, 'vehicle-photos');
      await supabase.storage.from('vehicle-photos').remove([storagePath]);

      const { error } = await supabase.from('vehicle_photos').delete().eq('id', photo.id);
      if (error) throw error;

      setPhotos(photos.filter(p => p.id !== photo.id));
      toast.success('Foto eliminada');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Error al eliminar la foto');
    }
  };

  const getPhotosByType = (type: 'before' | 'during' | 'after') => {
    return photos.filter(p => p.photo_type === type);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5" />
          Documentación Fotográfica
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as typeof selectedType)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="before" className="gap-2">
              Antes
              <span className="bg-muted text-muted-foreground text-xs px-1.5 rounded">
                {getPhotosByType('before').length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="during" className="gap-2">
              Durante
              <span className="bg-muted text-muted-foreground text-xs px-1.5 rounded">
                {getPhotosByType('during').length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="after" className="gap-2">
              Después
              <span className="bg-muted text-muted-foreground text-xs px-1.5 rounded">
                {getPhotosByType('after').length}
              </span>
            </TabsTrigger>
          </TabsList>

          {(['before', 'during', 'after'] as const).map(type => (
            <TabsContent key={type} value={type} className="space-y-4">
              {/* Upload Button */}
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e, type)}
                    disabled={uploading}
                  />
                  <Button variant="outline" className="gap-2" disabled={uploading} asChild>
                    <span>
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Subir foto "{PHOTO_TYPE_LABELS[type]}"
                    </span>
                  </Button>
                </label>
              </div>

              {/* Photo Grid */}
              {getPhotosByType(type).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay fotos "{PHOTO_TYPE_LABELS[type]}" aún</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {getPhotosByType(type).map(photo => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.signed_url || photo.photo_url}
                        alt={`Foto ${PHOTO_TYPE_LABELS[type]}`}
                        className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                        onClick={() => setSelectedPhoto(photo)}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        {(role === 'admin' || photo.uploaded_by === user?.id) && (
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={() => handleDelete(photo)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Full Image Modal */}
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl p-0">
            {selectedPhoto && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => setSelectedPhoto(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <img
                  src={selectedPhoto.signed_url || selectedPhoto.photo_url}
                  alt="Foto ampliada"
                  className="w-full max-h-[80vh] object-contain rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}