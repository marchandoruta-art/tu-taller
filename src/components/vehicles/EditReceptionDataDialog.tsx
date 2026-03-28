import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Loader2, Car, ClipboardCheck, User } from 'lucide-react';
import { toast } from 'sonner';
import { FuelGauge } from './reception/FuelGauge';
import { VehicleDiagram, ExteriorDamage } from './reception/VehicleDiagram';
import { InteriorChecklist, InteriorCheckData } from './reception/InteriorChecklist';
import { SignaturePad } from './reception/SignaturePad';
import type { VehicleWithOwner } from '@/lib/types';

interface EditReceptionDataDialogProps {
  vehicle: VehicleWithOwner;
  onSuccess: () => void;
}

const DEFAULT_INTERIOR: InteriorCheckData = {
  spare_wheel: false,
  jack: false,
  tools: false,
  warning_triangle: false,
  first_aid_kit: false,
  fire_extinguisher: false,
  radio: false,
  navigation: false,
  floor_mats: false,
  antenna: false,
  documents: false,
  keys_count: 1,
};

export function EditReceptionDataDialog({ vehicle, onSuccess }: EditReceptionDataDialogProps) {
  const { role } = useAuth();
  const { organizationId } = useOrganization();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEditOwner = role === 'admin' || role === 'oficina';

  const [ownerFields, setOwnerFields] = useState({
    name: vehicle.owner?.name || '',
    phone: vehicle.owner?.phone || '',
    email: vehicle.owner?.email || '',
    dni: vehicle.owner?.dni || '',
    address: vehicle.owner?.address || '',
  });

  const [vehicleFields, setVehicleFields] = useState({
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year?.toString() || '',
    color: vehicle.color || '',
    vin: vehicle.vin || '',
    client_description: vehicle.client_description || '',
  });

  const [inspectionFields, setInspectionFields] = useState({
    fuel_level: vehicle.fuel_level || 0,
    mileage: vehicle.mileage?.toString() || '',
    exterior_damages: (vehicle.exterior_damages as ExteriorDamage[] | null) || [],
    interior_check: (vehicle.interior_check as InteriorCheckData | null) || DEFAULT_INTERIOR,
    client_belongings: vehicle.client_belongings || '',
    reception_notes: vehicle.reception_notes || '',
    client_signature: vehicle.client_signature || '',
  });

  const resetFields = () => {
    setOwnerFields({
      name: vehicle.owner?.name || '',
      phone: vehicle.owner?.phone || '',
      email: vehicle.owner?.email || '',
      dni: vehicle.owner?.dni || '',
      address: vehicle.owner?.address || '',
    });
    setVehicleFields({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year?.toString() || '',
      color: vehicle.color || '',
      vin: vehicle.vin || '',
      client_description: vehicle.client_description || '',
    });
    setInspectionFields({
      fuel_level: vehicle.fuel_level || 0,
      mileage: vehicle.mileage?.toString() || '',
      exterior_damages: (vehicle.exterior_damages as ExteriorDamage[] | null) || [],
      interior_check: (vehicle.interior_check as InteriorCheckData | null) || DEFAULT_INTERIOR,
      client_belongings: vehicle.client_belongings || '',
      reception_notes: vehicle.reception_notes || '',
      client_signature: vehicle.client_signature || '',
    });
  };

  const handleSave = async () => {
    if (!vehicleFields.plate.trim() || !vehicleFields.brand.trim() || !vehicleFields.model.trim()) {
      toast.error('Matrícula, marca y modelo son obligatorios');
      return;
    }

    setLoading(true);
    try {
      // Update vehicle data
      const { error } = await supabase
        .from('vehicles')
        .update({
          plate: vehicleFields.plate,
          brand: vehicleFields.brand,
          model: vehicleFields.model,
          year: vehicleFields.year ? parseInt(vehicleFields.year) : null,
          color: vehicleFields.color || null,
          vin: vehicleFields.vin || null,
          client_description: vehicleFields.client_description || null,
          fuel_level: inspectionFields.fuel_level,
          mileage: inspectionFields.mileage ? parseInt(inspectionFields.mileage) : null,
          exterior_damages: JSON.parse(JSON.stringify(inspectionFields.exterior_damages)),
          interior_check: JSON.parse(JSON.stringify(inspectionFields.interior_check)),
          client_belongings: inspectionFields.client_belongings || null,
          reception_notes: inspectionFields.reception_notes || null,
          client_signature: inspectionFields.client_signature || null,
        })
        .eq('id', vehicle.id);

      if (error) throw error;

      // Update or create owner data if allowed
      if (canEditOwner && ownerFields.name.trim()) {
        if (vehicle.owner_id) {
          // Update existing owner
          const { error: ownerError } = await supabase
            .from('owners')
            .update({
              name: ownerFields.name,
              phone: ownerFields.phone || null,
              email: ownerFields.email || null,
              dni: ownerFields.dni || null,
              address: ownerFields.address || null,
            })
            .eq('id', vehicle.owner_id);
          if (ownerError) throw ownerError;
        } else {
          // Create new owner and link to vehicle
          const { data: newOwner, error: ownerError } = await supabase
            .from('owners')
            .insert({
              name: ownerFields.name,
              phone: ownerFields.phone || null,
              email: ownerFields.email || null,
              dni: ownerFields.dni || null,
              address: ownerFields.address || null,
              organization_id: organizationId,
            })
            .select('id')
            .single();
          if (ownerError) throw ownerError;
          // Link owner to vehicle
          const { error: linkError } = await supabase
            .from('vehicles')
            .update({ owner_id: newOwner.id })
            .eq('id', vehicle.id);
          if (linkError) throw linkError;
        }
      }

      toast.success('Datos actualizados correctamente');
      setOpen(false);
      onSuccess();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al guardar', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const tabCount = canEditOwner ? 3 : 2;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) resetFields(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-edit-reception>
          <Pencil className="mr-2 h-4 w-4" />
          Editar Datos Recepción
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Datos del Vehículo y Recepción
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <Tabs defaultValue="vehicle" className="space-y-4">
            <TabsList className={`grid w-full ${tabCount === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {canEditOwner && (
                <TabsTrigger value="owner" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Propietario
                </TabsTrigger>
              )}
              <TabsTrigger value="vehicle" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehículo
              </TabsTrigger>
              <TabsTrigger value="inspection" className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Inspección
              </TabsTrigger>
            </TabsList>

            {canEditOwner && (
              <TabsContent value="owner" className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={ownerFields.name}
                    onChange={(e) => setOwnerFields({ ...ownerFields, name: e.target.value })}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={ownerFields.phone}
                      onChange={(e) => setOwnerFields({ ...ownerFields, phone: e.target.value })}
                      placeholder="612 345 678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>DNI/NIF</Label>
                    <Input
                      value={ownerFields.dni}
                      onChange={(e) => setOwnerFields({ ...ownerFields, dni: e.target.value })}
                      placeholder="12345678A"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={ownerFields.email}
                    onChange={(e) => setOwnerFields({ ...ownerFields, email: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input
                    value={ownerFields.address}
                    onChange={(e) => setOwnerFields({ ...ownerFields, address: e.target.value })}
                    placeholder="Calle Principal, 123"
                  />
                </div>
              </TabsContent>
            )}

            <TabsContent value="vehicle" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Matrícula *</Label>
                  <Input
                    value={vehicleFields.plate}
                    onChange={(e) => setVehicleFields({ ...vehicleFields, plate: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Año</Label>
                  <Input
                    type="number"
                    value={vehicleFields.year}
                    onChange={(e) => setVehicleFields({ ...vehicleFields, year: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input
                    value={vehicleFields.brand}
                    onChange={(e) => setVehicleFields({ ...vehicleFields, brand: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input
                    value={vehicleFields.model}
                    onChange={(e) => setVehicleFields({ ...vehicleFields, model: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input
                    value={vehicleFields.color}
                    onChange={(e) => setVehicleFields({ ...vehicleFields, color: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nº Bastidor</Label>
                  <Input
                    value={vehicleFields.vin}
                    onChange={(e) => setVehicleFields({ ...vehicleFields, vin: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción del problema</Label>
                <Textarea
                  value={vehicleFields.client_description}
                  onChange={(e) => setVehicleFields({ ...vehicleFields, client_description: e.target.value })}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="inspection" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FuelGauge
                  value={inspectionFields.fuel_level}
                  onChange={(value) => setInspectionFields({ ...inspectionFields, fuel_level: value })}
                />
                <div className="space-y-2">
                  <Label>Kilometraje</Label>
                  <Input
                    type="number"
                    value={inspectionFields.mileage}
                    onChange={(e) => setInspectionFields({ ...inspectionFields, mileage: e.target.value })}
                    placeholder="125.000"
                  />
                  <p className="text-xs text-muted-foreground">km</p>
                </div>
              </div>

              <VehicleDiagram
                damages={inspectionFields.exterior_damages}
                onChange={(damages) => setInspectionFields({ ...inspectionFields, exterior_damages: damages })}
              />

              <InteriorChecklist
                data={inspectionFields.interior_check}
                onChange={(data) => setInspectionFields({ ...inspectionFields, interior_check: data })}
              />

              <div className="space-y-2">
                <Label>Objetos personales del cliente</Label>
                <Textarea
                  value={inspectionFields.client_belongings}
                  onChange={(e) => setInspectionFields({ ...inspectionFields, client_belongings: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Observaciones adicionales</Label>
                <Textarea
                  value={inspectionFields.reception_notes}
                  onChange={(e) => setInspectionFields({ ...inspectionFields, reception_notes: e.target.value })}
                  rows={2}
                />
              </div>

              <SignaturePad
                value={inspectionFields.client_signature}
                onChange={(signature) => setInspectionFields({ ...inspectionFields, client_signature: signature })}
              />
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
