import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Loader2, CheckCircle2, User, Car, History } from 'lucide-react';
import { toast } from 'sonner';
import { ScanTechnicalSheetButton, ScannedVehicleData } from './ScanTechnicalSheetButton';
import { useTranslation } from 'react-i18next';

interface QuickPlateDialogProps {
  onSuccess?: () => void;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
}

type PlateMatch =
  | { kind: 'active'; vehicleId: string; plate: string; brand: string; model: string; ownerId: string | null; ownerName?: string | null; ownerPhone?: string | null }
  | { kind: 'history'; vehicleId: string | null; plate: string; brand: string; model: string; ownerId: string | null; ownerName?: string | null; ownerPhone?: string | null; source: 'delivered' | 'archive' }
  | { kind: 'none' }
  | null;

/**
 * Ultra-fast vehicle creation by license plate only.
 * Detects existing client/vehicle history before creating.
 */
export function QuickPlateDialog({ onSuccess, triggerLabel, triggerVariant = 'outline', size = 'default' }: QuickPlateDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { t } = useTranslation();
  const resolvedTriggerLabel = triggerLabel ?? t('vehiclesUI.quickPlate.defaultTriggerLabel');
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<PlateMatch>(null);
  const [searching, setSearching] = useState(false);
  const [scanned, setScanned] = useState<ScannedVehicleData | null>(null);
  const debounceRef = useRef<number | null>(null);

  const reset = () => {
    setPlate('');
    setLoading(false);
    setMatch(null);
    setSearching(false);
    setScanned(null);
  };

  // Live lookup as the user types (debounced)
  useEffect(() => {
    if (!open || !organizationId) return;
    const p = plate.trim().toUpperCase();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (p.length < 4) {
      setMatch(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        // 1) Active vehicle
        const { data: active } = await supabase
          .from('vehicles')
          .select('id, plate, brand, model, archived, owner_id, owner:owners(name, phone)')
          .eq('organization_id', organizationId)
          .ilike('plate', p)
          .eq('archived', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (active) {
          setMatch({
            kind: 'active',
            vehicleId: active.id,
            plate: active.plate,
            brand: active.brand,
            model: active.model,
            ownerId: active.owner_id,
            ownerName: (active as any).owner?.name ?? null,
            ownerPhone: (active as any).owner?.phone ?? null,
          });
          return;
        }

        // 2) Delivered/archived vehicles (still in vehicles table)
        const { data: delivered } = await supabase
          .from('vehicles')
          .select('id, brand, model, owner_id, owner:owners(name, phone)')
          .eq('organization_id', organizationId)
          .ilike('plate', p)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (delivered) {
          setMatch({
            kind: 'history',
            vehicleId: delivered.id,
            plate: p,
            brand: delivered.brand,
            model: delivered.model,
            ownerId: delivered.owner_id,
            ownerName: (delivered as any).owner?.name ?? null,
            ownerPhone: (delivered as any).owner?.phone ?? null,
            source: 'delivered',
          });
          return;
        }

        // 3) Deep archive snapshot
        const { data: archSnap } = await supabase
          .from('vehicle_archives')
          .select('brand, model, owner_id, owner_snapshot')
          .eq('organization_id', organizationId)
          .ilike('plate', p)
          .order('archived_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (archSnap) {
          const snap = (archSnap as any).owner_snapshot || {};
          setMatch({
            kind: 'history',
            vehicleId: null,
            plate: p,
            brand: archSnap.brand,
            model: archSnap.model,
            ownerId: archSnap.owner_id,
            ownerName: snap.name ?? null,
            ownerPhone: snap.phone ?? null,
            source: 'archive',
          });
          return;
        }

        setMatch({ kind: 'none' });
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [plate, open, organizationId]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const p = plate.trim().toUpperCase();
    if (!p || !user || !organizationId) return;

    setLoading(true);
    try {
      // Always create a NEW vehicle row. Only copy client + vehicle data (plate, brand, model, owner).
      // No previous description/tasks/parts/history is carried over.
      const existingMatch = match && match.kind !== 'none' ? match : null;
      const brand = scanned?.brand || (existingMatch ? (existingMatch.brand || t('vehiclesUI.newVehicle.unspecified')) : t('vehiclesUI.newVehicle.unspecified'));
      const model = scanned?.model || (existingMatch ? (existingMatch.model || t('vehiclesUI.newVehicle.unspecified')) : t('vehiclesUI.newVehicle.unspecified'));
      const ownerId = existingMatch ? existingMatch.ownerId : null;

      const { data: created, error } = await supabase
        .from('vehicles')
        .insert([{
          plate: p,
          brand,
          model,
          year: scanned?.year ?? null,
          vin: scanned?.vin ?? null,
          color: scanned?.color ?? null,
          owner_id: ownerId,
          created_by: user.id,
          organization_id: organizationId,
          status: 'recibido',
        }])
        .select('id')
        .single();

      if (error) throw error;

      if (ownerId && existingMatch?.ownerName) {
        toast.success(t('vehiclesUI.quickPlate.orderCreatedLinked', { plate: p, owner: existingMatch.ownerName }));
      } else {
        toast.success(t('vehiclesUI.quickPlate.orderCreated', { plate: p }));
      }
      setOpen(false);
      reset();
      onSuccess?.();
      navigate(`/vehicles/${created.id}`);
    } catch (err: any) {
      toast.error(t('vehiclesUI.quickPlate.errorCreatingVehicle'), { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const renderMatchInfo = () => {
    if (!plate.trim() || plate.trim().length < 4) return null;
    if (searching) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-md border bg-muted/30">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('vehiclesUI.quickPlate.searchingHistory')}
        </div>
      );
    }
    if (!match) return null;

    if (match.kind === 'active') {
      return (
        <div className="p-3 rounded-md border border-primary/40 bg-primary/5 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle2 className="h-4 w-4" /> {t('vehiclesUI.quickPlate.vehicleFound')}
          </div>
          <div className="text-sm flex items-center gap-2">
            <Car className="h-3.5 w-3.5 text-muted-foreground" />
            {match.brand} {match.model}
          </div>
          {match.ownerName && (
            <div className="text-sm flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {match.ownerName}{match.ownerPhone ? ` · ${match.ownerPhone}` : ''}
            </div>
          )}
          <p className="text-xs text-muted-foreground pt-1">{t('vehiclesUI.quickPlate.newOrderNote')}</p>
        </div>
      );
    }

    if (match.kind === 'history') {
      return (
        <div className="p-3 rounded-md border border-amber-500/40 bg-amber-500/5 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
            <History className="h-4 w-4" /> {t('vehiclesUI.quickPlate.recurringClient')}
          </div>
          <div className="text-sm flex items-center gap-2">
            <Car className="h-3.5 w-3.5 text-muted-foreground" />
            {match.brand} {match.model}
          </div>
          {match.ownerName ? (
            <div className="text-sm flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {match.ownerName}{match.ownerPhone ? ` · ${match.ownerPhone}` : ''}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">{t('vehiclesUI.quickPlate.noOwnerRegistered')}</div>
          )}
          <p className="text-xs text-muted-foreground pt-1">
            {match.ownerId ? t('vehiclesUI.quickPlate.newFileNoteLinked') : t('vehiclesUI.quickPlate.newFileNoteUnlinked')}
          </p>
        </div>
      );
    }

    return (
      <div className="p-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
        {t('vehiclesUI.quickPlate.newPlate')}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={size} className="gap-2">
          <Zap className="h-4 w-4" />
          {resolvedTriggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t('vehiclesUI.quickPlate.title')}
          </DialogTitle>
          <DialogDescription>
            {t('vehiclesUI.quickPlate.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="quick-plate">{t('vehiclesUI.quickPlate.plate')}</Label>
            <Input
              id="quick-plate"
              autoFocus
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder={t('vehiclesUI.quickPlate.platePlaceholder')}
              className="uppercase font-mono text-lg tracking-wider"
              maxLength={12}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{t('vehiclesUI.quickPlate.orFillWithPhoto')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <ScanTechnicalSheetButton
            className="w-full gap-2"
            onScanned={(data) => {
              setScanned(data);
              if (data.plate) setPlate(data.plate);
            }}
          />

          {scanned && (
            <div className="p-3 rounded-md border bg-primary/5 text-xs space-y-0.5">
              <div className="font-semibold text-primary flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {t('vehiclesUI.quickPlate.detectedData')}
              </div>
              {scanned.brand && <div>{t('vehiclesUI.quickPlate.brandLabel', { brand: scanned.brand })}</div>}
              {scanned.model && <div>{t('vehiclesUI.quickPlate.modelLabel', { model: scanned.model })}</div>}
              {scanned.year && <div>{t('vehiclesUI.quickPlate.yearLabel', { year: scanned.year })}</div>}
              {scanned.vin && <div>{t('vehiclesUI.quickPlate.vinLabel', { vin: scanned.vin })}</div>}
              {scanned.color && <div>{t('vehiclesUI.quickPlate.colorLabel', { color: scanned.color })}</div>}
            </div>
          )}

          {renderMatchInfo()}

          <Button type="submit" className="w-full" disabled={loading || !plate.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            {loading ? t('vehiclesUI.quickPlate.creating') : t('vehiclesUI.quickPlate.createNewOrder')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
