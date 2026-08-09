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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.error(t('editReceptionData.requiredFieldsError'));
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

      toast.success(t('editReceptionData.updateSuccess'));
      setOpen(false);
      onSuccess();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('editReceptionData.unknownError');
      toast.error(t('editReceptionData.saveErrorTitle'), { description: msg });
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
          {t('editReceptionData.triggerButton')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {t('editReceptionData.dialogTitle')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <Tabs defaultValue="vehicle" className="space-y-4">
            <TabsList className={`grid w-full ${tabCount === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {canEditOwner && (
                <TabsTrigger value="owner" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('editReceptionData.tabOwner')}
                </TabsTrigger>
              )}
              <TabsTrigger value="vehicle" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                {t('editReceptionData.tabVehicle')}
              </TabsTrigger>
              <TabsTrigger value="inspection" className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                {t('editReceptionData.tabInspection')}
              </TabsTrigger>
            </TabsList>

            {canEditOwner && (
              <TabsContent value="owner" className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('editReceptionData.ownerName')}</Label>
                  <Input
                    value={ownerFields.name}
                    onChange={(e) => setOwnerFields({ ...ownerFields, name: e.target.value })}
                    placeholder={t('editReceptionData.ownerNamePlaceholder')}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('editReceptionData.ownerPhone')}</Label>
                    <Input
                      value={ownerFields.phone}
                      onChange={(e) => setOwnerFields({ ...ownerFields, phone: e.target.value })}
                      placeholder={t('editReceptionData.ownerPhonePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('editReceptionData.ownerDni')}</Label>
                    <Input
                      value={ownerFields.dni}
                      onChange={(e) => setOwnerFields({ ...ownerFields, dni: e.target.value })}
                      placeholder={t('editReceptionData.ownerDniPlaceholder')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('editReceptionData.ownerEmail')}</Label>
                  <Input
                    type="email"
                    value={ownerFields.email}
                    onChange={(e) => setOwnerFields({ ...ownerFields, email: e.target.value })}
                    placeholder={t('editReceptionData.ownerEmailPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('editReceptionData.ownerAddress')}</Label>
                  <Input
                    value={ownerFields.address}
                    onChange={(e) => setOwnerFields({ ...ownerFields, address: e.target.value })}
                    placeholder={t('editReceptionData.ownerAddressPlaceholder')}
                  />
                </div>
              </TabsContent>
            )}

            <TabsContent value="vehicle" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('editReceptionData.plate')}</Label>
                  <Input
                    value={vehicleFields.plate}
                    onChange={(e) => setVehicleFields({ ...vehicleFields, plate: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('editReceptionData.year')}</Label>
                  <Input
                    type="number"
                    value={vehicleFields.year}
                    onChange={(e) => setVehicleFields({ ...vehicleFields, year: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('editReceptionData.brand')}</Label>
                  <Input
                    value={vehicleFields.brand}
                    onChange={(e) => setVehicleFields({ ...vehicleFields, brand: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('editReceptionData.model')}</Label>
                  <Input
                    value={vehicleFields.model}
                    onChange={(e) => setVehicleFields({ ...vehicleFields, model: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('editReceptionData.color')}</Label>
                  <Input
                    value={vehicleFields.color}
                    onChange={(e) => setVehicleFields({ ...vehicleFields, color: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('editReceptionData.vin')}</Label>
                  <Input
                    value={vehicleFields.vin}
                    onChange={(e) => setVehicleFields({ ...vehicleFields, vin: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('editReceptionData.problemDescription')}</Label>
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
                  <Label>{t('editReceptionData.mileage')}</Label>
                  <Input
                    type="number"
                    value={inspectionFields.mileage}
                    onChange={(e) => setInspectionFields({ ...inspectionFields, mileage: e.target.value })}
                    placeholder={t('editReceptionData.mileagePlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">{t('editReceptionData.mileageUnit')}</p>
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
                <Label>{t('editReceptionData.clientBelongings')}</Label>
                <Textarea
                  value={inspectionFields.client_belongings}
                  onChange={(e) => setInspectionFields({ ...inspectionFields, client_belongings: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('editReceptionData.additionalNotes')}</Label>
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
            {t('editReceptionData.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('editReceptionData.saveChanges')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
