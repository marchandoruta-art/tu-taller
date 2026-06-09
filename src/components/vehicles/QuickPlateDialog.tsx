import { useState } from 'react';
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
import { Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuickPlateDialogProps {
  onSuccess?: () => void;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
}

/**
 * Ultra-fast vehicle creation by license plate only.
 * - If plate already exists in an active vehicle -> opens its detail.
 * - If plate exists in archives/delivered -> prefills brand/model/owner.
 * - Else creates new vehicle with placeholders, status='recibido', and opens detail.
 */
export function QuickPlateDialog({ onSuccess, triggerLabel = 'Crear / Abrir matrícula', triggerVariant = 'outline', size = 'default' }: QuickPlateDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setPlate('');
    setLoading(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const p = plate.trim().toUpperCase();
    if (!p || !user || !organizationId) return;

    setLoading(true);
    try {
      // 1) Look for an existing active (non-archived) vehicle
      const { data: active } = await supabase
        .from('vehicles')
        .select('id, plate, archived')
        .eq('organization_id', organizationId)
        .ilike('plate', p)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (active) {
        toast.info(`Abriendo ficha existente de ${active.plate}`);
        setOpen(false);
        reset();
        navigate(`/vehicles/${active.id}`);
        return;
      }

      // 2) Look in archived/delivered or vehicle_archives for known data
      let brand = 'Sin especificar';
      let model = 'Sin especificar';
      let ownerId: string | null = null;

      const { data: archivedLive } = await supabase
        .from('vehicles')
        .select('brand, model, owner_id')
        .eq('organization_id', organizationId)
        .ilike('plate', p)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (archivedLive) {
        brand = archivedLive.brand || brand;
        model = archivedLive.model || model;
        ownerId = archivedLive.owner_id;
      } else {
        const { data: archSnap } = await supabase
          .from('vehicle_archives')
          .select('brand, model, owner_id')
          .eq('organization_id', organizationId)
          .ilike('plate', p)
          .order('archived_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (archSnap) {
          brand = archSnap.brand || brand;
          model = archSnap.model || model;
          ownerId = archSnap.owner_id;
        }
      }

      // 3) Create the vehicle
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

      toast.success(`Vehículo ${p} creado`);
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
            Si ya existe, abre la ficha. Si no, crea el vehículo y podrás completar marca y modelo después.
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
          <Button type="submit" className="w-full" disabled={loading || !plate.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            {loading ? 'Procesando...' : 'Crear o abrir'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
