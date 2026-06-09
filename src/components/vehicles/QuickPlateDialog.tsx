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

interface QuickPlateDialogProps {
  onSuccess?: () => void;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
}

type PlateMatch =
  | { kind: 'active'; vehicleId: string; plate: string; brand: string; model: string; ownerName?: string | null; ownerPhone?: string | null }
  | { kind: 'history'; plate: string; brand: string; model: string; ownerId: string | null; ownerName?: string | null; ownerPhone?: string | null; source: 'delivered' | 'archive' }
  | { kind: 'none' }
  | null;

/**
 * Ultra-fast vehicle creation by license plate only.
 * Detects existing client/vehicle history before creating.
 */
export function QuickPlateDialog({ onSuccess, triggerLabel = 'Crear / Abrir matrícula', triggerVariant = 'outline', size = 'default' }: QuickPlateDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<PlateMatch>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const reset = () => {
    setPlate('');
    setLoading(false);
    setMatch(null);
    setSearching(false);
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
          .select('id, plate, brand, model, archived, owner:owners(name, phone)')
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
            ownerName: (active as any).owner?.name ?? null,
            ownerPhone: (active as any).owner?.phone ?? null,
          });
          return;
        }

        // 2) Delivered/archived vehicles (still in vehicles table)
        const { data: delivered } = await supabase
          .from('vehicles')
          .select('brand, model, owner_id, owner:owners(name, phone)')
          .eq('organization_id', organizationId)
          .ilike('plate', p)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (delivered) {
          setMatch({
            kind: 'history',
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

    // Active match → just open
    if (match && match.kind === 'active') {
      toast.info(`Abriendo ficha existente de ${match.plate}`);
      setOpen(false);
      const id = match.vehicleId;
      reset();
      navigate(`/vehicles/${id}`);
      return;
    }

    setLoading(true);
    try {
      const brand = match && match.kind === 'history' ? (match.brand || 'Sin especificar') : 'Sin especificar';
      const model = match && match.kind === 'history' ? (match.model || 'Sin especificar') : 'Sin especificar';
      const ownerId = match && match.kind === 'history' ? match.ownerId : null;

      const { data: created, error } = await supabase
        .from('vehicles')
        .insert([{
          plate: p,
          brand,
          model,
          owner_id: ownerId,
          created_by: user.id,
          organization_id: organizationId,
          status: 'recibido',
        }])
        .select('id')
        .single();

      if (error) throw error;

      if (ownerId && match && match.kind === 'history' && match.ownerName) {
        toast.success(`Vehículo ${p} creado y vinculado a ${match.ownerName}`);
      } else {
        toast.success(`Vehículo ${p} creado`);
      }
      setOpen(false);
      reset();
      onSuccess?.();
      navigate(`/vehicles/${created.id}`);
    } catch (err: any) {
      toast.error('Error al crear el vehículo', { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const renderMatchInfo = () => {
    if (!plate.trim() || plate.trim().length < 4) return null;
    if (searching) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-md border bg-muted/30">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando histórico...
        </div>
      );
    }
    if (!match) return null;

    if (match.kind === 'active') {
      return (
        <div className="p-3 rounded-md border border-primary/40 bg-primary/5 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle2 className="h-4 w-4" /> Ficha activa encontrada
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
          <p className="text-xs text-muted-foreground pt-1">Al pulsar se abrirá la ficha existente.</p>
        </div>
      );
    }

    if (match.kind === 'history') {
      return (
        <div className="p-3 rounded-md border border-amber-500/40 bg-amber-500/5 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
            <History className="h-4 w-4" /> Cliente recurrente detectado
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
            <div className="text-xs text-muted-foreground">Sin propietario registrado.</div>
          )}
          <p className="text-xs text-muted-foreground pt-1">
            Se creará una nueva ficha {match.ownerId ? 'vinculada al mismo cliente' : 'sin propietario'} (origen: {match.source === 'archive' ? 'archivo' : 'entregado'}).
          </p>
        </div>
      );
    }

    return (
      <div className="p-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
        Matrícula nueva. Se creará una ficha en blanco.
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={size} className="gap-2">
          <Zap className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Crear rápido por matrícula
          </DialogTitle>
          <DialogDescription>
            Detectamos automáticamente si ya ha venido antes y reutilizamos el cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="quick-plate">Matrícula</Label>
            <Input
              id="quick-plate"
              autoFocus
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="1234ABC"
              className="uppercase font-mono text-lg tracking-wider"
              maxLength={12}
            />
          </div>

          {renderMatchInfo()}

          <Button type="submit" className="w-full" disabled={loading || !plate.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            {match?.kind === 'active'
              ? 'Abrir ficha existente'
              : loading ? 'Creando...' : 'Crear ficha'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
