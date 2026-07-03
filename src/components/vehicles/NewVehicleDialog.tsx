import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Loader2, Car, User, SkipForward, ClipboardCheck, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types';
import { FuelGauge } from './reception/FuelGauge';
import { VehicleDiagram, ExteriorDamage } from './reception/VehicleDiagram';
import { InteriorChecklist, InteriorCheckData } from './reception/InteriorChecklist';
import { SignaturePad } from './reception/SignaturePad';
import { DepositReceipt } from './reception/DepositReceipt';
import { ScanTechnicalSheetButton } from './ScanTechnicalSheetButton';

interface NewVehicleDialogProps {
  onSuccess?: () => void;
}

type Step = 'owner' | 'vehicle' | 'inspection' | 'review';

const STEP_TITLES: Record<Step, { icon: React.ReactNode; title: string }> = {
  owner: { icon: <User className="h-5 w-5" />, title: 'Datos del Propietario' },
  vehicle: { icon: <Car className="h-5 w-5" />, title: 'Datos del Vehículo' },
  inspection: { icon: <ClipboardCheck className="h-5 w-5" />, title: 'Inspección de Recepción' },
  review: { icon: <FileText className="h-5 w-5" />, title: 'Resumen y Recibo' },
};

const STEP_ORDER: Step[] = ['owner', 'vehicle', 'inspection', 'review'];

export function NewVehicleDialog({ onSuccess }: NewVehicleDialogProps) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('owner');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [skipOwner, setSkipOwner] = useState(false);

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

  const [inspectionData, setInspectionData] = useState({
    fuel_level: 0,
    mileage: '',
    exterior_damages: [] as ExteriorDamage[],
    interior_check: {
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
    } as InteriorCheckData,
    client_belongings: '',
    reception_notes: '',
    client_signature: '',
  });

  // Fetch user role
  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setUserRole(data.role as UserRole);
      }
    };
    fetchRole();
  }, [user]);

  const isAdmin = userRole === 'admin';
  const currentStepIndex = STEP_ORDER.indexOf(step);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setStep(STEP_ORDER[nextIndex]);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEP_ORDER[prevIndex]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If not on review step, go to next step
    if (step !== 'review') {
      goToNextStep();
      return;
    }

    setLoading(true);
    try {
      if (!user) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

      const { data: profileOrg } = organizationId
        ? { data: { organization_id: organizationId } }
        : await supabase
            .from('profiles')
            .select('organization_id')
            .eq('user_id', user.id)
            .single();

      const resolvedOrganizationId = profileOrg?.organization_id ?? null;

      if (!resolvedOrganizationId) {
        throw new Error('Tu usuario no está asociado a ningún taller.');
      }

      let ownerId: string | null = null;

      // Only create owner if we have owner data and not skipping
      if (!skipOwner && ownerData.name.trim()) {
        const { data: owner, error: ownerError } = await supabase
          .from('owners')
          .insert([{ ...ownerData, organization_id: resolvedOrganizationId }])
          .select()
          .single();

        if (ownerError) throw ownerError;
        ownerId = owner.id;
      }

      // Create vehicle with inspection data
      const { error: vehicleError } = await supabase.from('vehicles').insert([
        {
          plate: vehicleData.plate,
          brand: vehicleData.brand,
          model: vehicleData.model,
          year: vehicleData.year ? parseInt(vehicleData.year) : null,
          color: vehicleData.color || null,
          vin: vehicleData.vin || null,
          client_description: vehicleData.client_description || null,
          client_tasks: vehicleData.client_description
            ? JSON.parse(JSON.stringify(
                vehicleData.client_description
                  .split('\n')
                  .map((line: string) => line.trim())
                  .filter((line: string) => line.length > 0)
                  .map((text: string) => ({ text, done: false }))
              ))
            : [],
          owner_id: ownerId,
          created_by: user?.id,
          organization_id: resolvedOrganizationId,
          fuel_level: inspectionData.fuel_level,
          mileage: inspectionData.mileage ? parseInt(inspectionData.mileage) : null,
          exterior_damages: JSON.parse(JSON.stringify(inspectionData.exterior_damages)),
          interior_check: JSON.parse(JSON.stringify(inspectionData.interior_check)),
          client_belongings: inspectionData.client_belongings || null,
          client_signature: inspectionData.client_signature || null,
          reception_notes: inspectionData.reception_notes || null,
          reception_date: new Date().toISOString(),
          deposit_receipt_generated: true,
        },
      ]);

      if (vehicleError) throw vehicleError;

      toast.success('Vehículo registrado correctamente');
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al registrar el vehículo', { description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipOwner = () => {
    setSkipOwner(true);
    setStep('vehicle');
  };

  const resetForm = () => {
    setStep('owner');
    setSkipOwner(false);
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
    setInspectionData({
      fuel_level: 0,
      mileage: '',
      exterior_damages: [],
      interior_check: {
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
      },
      client_belongings: '',
      reception_notes: '',
      client_signature: '',
    });
  };

  const canProceed = () => {
    switch (step) {
      case 'owner':
        return !isAdmin || ownerData.name.trim() !== '';
      case 'vehicle':
        return vehicleData.plate.trim() !== '' && vehicleData.brand.trim() !== '' && vehicleData.model.trim() !== '';
      case 'inspection':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const stepConfig = STEP_TITLES[step];

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Vehículo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {stepConfig.icon}
            {stepConfig.title}
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-2">
            {STEP_ORDER.map((s, index) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index <= currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                {index < STEP_ORDER.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 'owner' && (
              <>
                {!isAdmin && (
                  <div className="bg-muted/50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">
                      Puedes omitir los datos del propietario y registrar solo el vehículo.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="owner-name">Nombre {isAdmin && '*'}</Label>
                  <Input
                    id="owner-name"
                    value={ownerData.name}
                    onChange={(e) => setOwnerData({ ...ownerData, name: e.target.value })}
                    placeholder="Juan Pérez"
                    required={isAdmin}
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
            )}

            {step === 'vehicle' && (
              <>
                <ScanTechnicalSheetButton
                  className="w-full gap-2"
                  variant="outline"
                  onScanned={(data) => {
                    setVehicleData((prev) => ({
                      ...prev,
                      plate: data.plate || prev.plate,
                      brand: data.brand || prev.brand,
                      model: data.model || prev.model,
                      year: data.year ? String(data.year) : prev.year,
                      vin: data.vin || prev.vin,
                      color: data.color || prev.color,
                    }));
                  }}
                />
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
                    placeholder="Escribe cada trabajo o problema en una línea separada. Ej:&#10;Ruido en frenos delanteros&#10;Cambio de aceite&#10;Revisar luces traseras"
                    rows={3}
                  />
                </div>
              </>
            )}

            {step === 'inspection' && (
              <div className="space-y-6">
                {/* Fuel and Mileage */}
                <div className="grid grid-cols-2 gap-4">
                  <FuelGauge
                    value={inspectionData.fuel_level}
                    onChange={(value) => setInspectionData({ ...inspectionData, fuel_level: value })}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="mileage">Kilometraje</Label>
                    <Input
                      id="mileage"
                      type="number"
                      value={inspectionData.mileage}
                      onChange={(e) => setInspectionData({ ...inspectionData, mileage: e.target.value })}
                      placeholder="125.000"
                    />
                    <p className="text-xs text-muted-foreground">km</p>
                  </div>
                </div>

                {/* Exterior Damages */}
                <VehicleDiagram
                  damages={inspectionData.exterior_damages}
                  onChange={(damages) => setInspectionData({ ...inspectionData, exterior_damages: damages })}
                />

                {/* Interior Checklist */}
                <InteriorChecklist
                  data={inspectionData.interior_check}
                  onChange={(data) => setInspectionData({ ...inspectionData, interior_check: data })}
                />

                {/* Client Belongings */}
                <div className="space-y-2">
                  <Label htmlFor="belongings">Objetos personales del cliente en el vehículo</Label>
                  <Textarea
                    id="belongings"
                    value={inspectionData.client_belongings}
                    onChange={(e) => setInspectionData({ ...inspectionData, client_belongings: e.target.value })}
                    placeholder="Gafas de sol, cargador móvil, paraguas..."
                    rows={2}
                  />
                </div>

                {/* Reception Notes */}
                <div className="space-y-2">
                  <Label htmlFor="reception-notes">Observaciones adicionales</Label>
                  <Textarea
                    id="reception-notes"
                    value={inspectionData.reception_notes}
                    onChange={(e) => setInspectionData({ ...inspectionData, reception_notes: e.target.value })}
                    placeholder="Cualquier observación adicional sobre el estado del vehículo..."
                    rows={2}
                  />
                </div>

                {/* Signature */}
                <SignaturePad
                  value={inspectionData.client_signature}
                  onChange={(signature) => setInspectionData({ ...inspectionData, client_signature: signature })}
                />
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-6">
                {/* Summary sections */}
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Cliente
                    </h4>
                    {skipOwner || !ownerData.name ? (
                      <p className="text-sm text-muted-foreground">Sin datos de propietario</p>
                    ) : (
                      <div className="text-sm space-y-1">
                        <p><strong>Nombre:</strong> {ownerData.name}</p>
                        {ownerData.phone && <p><strong>Teléfono:</strong> {ownerData.phone}</p>}
                        {ownerData.dni && <p><strong>DNI:</strong> {ownerData.dni}</p>}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Vehículo
                    </h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Matrícula:</strong> {vehicleData.plate}</p>
                      <p><strong>Vehículo:</strong> {vehicleData.brand} {vehicleData.model} {vehicleData.year && `(${vehicleData.year})`}</p>
                      {vehicleData.color && <p><strong>Color:</strong> {vehicleData.color}</p>}
                      {inspectionData.mileage && <p><strong>Km:</strong> {inspectionData.mileage}</p>}
                      <p><strong>Combustible:</strong> {inspectionData.fuel_level}/8</p>
                    </div>
                  </div>

                  {inspectionData.exterior_damages.length > 0 && (
                    <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                      <h4 className="font-medium mb-2 text-destructive">
                        ⚠️ {inspectionData.exterior_damages.length} daño(s) registrado(s)
                      </h4>
                    </div>
                  )}
                </div>

                {/* Generate Receipt */}
                <DepositReceipt
                  ownerData={ownerData}
                  vehicleData={vehicleData}
                  inspectionData={inspectionData}
                />
              </div>
            )}

            <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-2">
              {step === 'owner' && !isAdmin && (
                <Button type="button" variant="outline" onClick={handleSkipOwner}>
                  <SkipForward className="mr-2 h-4 w-4" />
                  Omitir
                </Button>
              )}
              {currentStepIndex > 0 && (
                <Button type="button" variant="outline" onClick={goToPreviousStep}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Atrás
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={loading || !canProceed()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {step === 'review' ? (
                  'Registrar Vehículo'
                ) : (
                  <>
                    Siguiente
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
