import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Car, User } from 'lucide-react';
import { toast } from 'sonner';

interface NewVehicleDialogProps {
  onSuccess?: () => void;
}

export function NewVehicleDialog({ onSuccess }: NewVehicleDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'owner' | 'vehicle'>('owner');

  const [ownerData, setOwnerData] = useState({
    name: '',
    phone: '',
    email: '',
    dni: '',
    address: '',
  });

  const [vehicleData, setVehicleData] = useState({
    plate: '',
    brand: '',
    model: '',
    year: '',
    color: '',
    vin: '',
    client_description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'owner') {
      setStep('vehicle');
      return;
    }

    setLoading(true);
    try {
      // Create owner
      const { data: owner, error: ownerError } = await supabase
        .from('owners')
        .insert([ownerData])
        .select()
        .single();

      if (ownerError) throw ownerError;

      // Create vehicle
      const { error: vehicleError } = await supabase.from('vehicles').insert([
        {
          ...vehicleData,
          year: vehicleData.year ? parseInt(vehicleData.year) : null,
          owner_id: owner.id,
          created_by: user?.id,
        },
      ]);

      if (vehicleError) throw vehicleError;

      toast.success('Vehículo registrado correctamente');
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      toast.error('Error al registrar el vehículo', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('owner');
    setOwnerData({ name: '', phone: '', email: '', dni: '', address: '' });
    setVehicleData({
      plate: '',
      brand: '',
      model: '',
      year: '',
      color: '',
      vin: '',
      client_description: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Vehículo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'owner' ? (
              <>
                <User className="h-5 w-5" />
                Datos del Propietario
              </>
            ) : (
              <>
                <Car className="h-5 w-5" />
                Datos del Vehículo
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 'owner' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="owner-name">Nombre *</Label>
                <Input
                  id="owner-name"
                  value={ownerData.name}
                  onChange={(e) => setOwnerData({ ...ownerData, name: e.target.value })}
                  placeholder="Juan Pérez"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner-phone">Teléfono</Label>
                  <Input
                    id="owner-phone"
                    value={ownerData.phone}
                    onChange={(e) => setOwnerData({ ...ownerData, phone: e.target.value })}
                    placeholder="612 345 678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-dni">DNI/NIF</Label>
                  <Input
                    id="owner-dni"
                    value={ownerData.dni}
                    onChange={(e) => setOwnerData({ ...ownerData, dni: e.target.value })}
                    placeholder="12345678A"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-email">Email</Label>
                <Input
                  id="owner-email"
                  type="email"
                  value={ownerData.email}
                  onChange={(e) => setOwnerData({ ...ownerData, email: e.target.value })}
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-address">Dirección</Label>
                <Input
                  id="owner-address"
                  value={ownerData.address}
                  onChange={(e) => setOwnerData({ ...ownerData, address: e.target.value })}
                  placeholder="Calle Principal, 123"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-plate">Matrícula *</Label>
                  <Input
                    id="vehicle-plate"
                    value={vehicleData.plate}
                    onChange={(e) => setVehicleData({ ...vehicleData, plate: e.target.value.toUpperCase() })}
                    placeholder="1234 ABC"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-year">Año</Label>
                  <Input
                    id="vehicle-year"
                    type="number"
                    value={vehicleData.year}
                    onChange={(e) => setVehicleData({ ...vehicleData, year: e.target.value })}
                    placeholder="2020"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-brand">Marca *</Label>
                  <Input
                    id="vehicle-brand"
                    value={vehicleData.brand}
                    onChange={(e) => setVehicleData({ ...vehicleData, brand: e.target.value })}
                    placeholder="Volkswagen"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-model">Modelo *</Label>
                  <Input
                    id="vehicle-model"
                    value={vehicleData.model}
                    onChange={(e) => setVehicleData({ ...vehicleData, model: e.target.value })}
                    placeholder="Golf"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-color">Color</Label>
                  <Input
                    id="vehicle-color"
                    value={vehicleData.color}
                    onChange={(e) => setVehicleData({ ...vehicleData, color: e.target.value })}
                    placeholder="Blanco"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-vin">Nº Bastidor</Label>
                  <Input
                    id="vehicle-vin"
                    value={vehicleData.vin}
                    onChange={(e) => setVehicleData({ ...vehicleData, vin: e.target.value })}
                    placeholder="VIN"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-description">¿Qué le ocurre al vehículo?</Label>
                <Textarea
                  id="vehicle-description"
                  value={vehicleData.client_description}
                  onChange={(e) => setVehicleData({ ...vehicleData, client_description: e.target.value })}
                  placeholder="Describe lo que el cliente indica sobre el problema del vehículo..."
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            {step === 'vehicle' && (
              <Button type="button" variant="outline" onClick={() => setStep('owner')}>
                Atrás
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {step === 'owner' ? 'Siguiente' : 'Registrar Vehículo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
