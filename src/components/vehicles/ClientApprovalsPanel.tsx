import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock, Plus, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Approval {
  id: string;
  description: string;
  estimated_info: string | null;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  created_at: string;
  client_response_at: string | null;
  client_note: string | null;
}

interface Props {
  vehicleId: string;
  vehiclePlate: string;
  ownerPhone?: string | null;
}

export function ClientApprovalsPanel({ vehicleId, vehiclePlate, ownerPhone }: Props) {
  const { user, role } = useAuth();
  const { organizationId } = useOrganization();
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [estimated, setEstimated] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = role === 'admin' || role === 'oficina';

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_approvals')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [vehicleId]);

  const create = async () => {
    if (!user || !organizationId || !description.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('client_approvals').insert({
      vehicle_id: vehicleId,
      organization_id: organizationId,
      description: description.trim(),
      estimated_info: estimated.trim() || null,
      requested_by: user.id,
    });
    setSaving(false);
    if (error) return toast.error('Error al crear solicitud');
    toast.success('Solicitud creada');
    setDescription(''); setEstimated(''); setOpen(false);
    fetchItems();
  };

  const shareOnWhatsApp = async (approval: Approval) => {
    if (!ownerPhone) return toast.error('El cliente no tiene teléfono');
    // Get or create a portal token
    const { data: existing } = await supabase
      .from('client_portal_tokens')
      .select('token, expires_at, revoked')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let token = existing && !existing.revoked && new Date(existing.expires_at) > new Date()
      ? existing.token
      : null;

    if (!token) {
      const { data: created, error } = await supabase
        .from('client_portal_tokens')
        .insert([{ vehicle_id: vehicleId, organization_id: organizationId, created_by: user!.id }])
        .select('token').single();
      if (error || !created) return toast.error('No se pudo generar el enlace');
      token = created.token;
    }

    const portalUrl = `${window.location.origin}/c/${token}`;
    const phone = ownerPhone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
    const intl = phone.startsWith('34') ? phone : `34${phone}`;
    const msg = `Hola, necesitamos su aprobación para un trabajo adicional en su vehículo ${vehiclePlate}:\n\n"${approval.description}"\n\nRevíselo y apruébelo/recházelo aquí: ${portalUrl}`;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const statusBadge = (s: Approval['status']) => {
    if (s === 'aprobado') return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-3 w-3 mr-1"/>Aprobado</Badge>;
    if (s === 'rechazado') return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1"/>Rechazado</Badge>;
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1"/>Pendiente</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Aprobaciones del cliente
        </CardTitle>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5"/>Solicitar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Solicitar aprobación al cliente</DialogTitle>
                <DialogDescription>
                  Describe el trabajo adicional. El cliente lo verá y podrá aprobarlo desde su enlace del portal.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Textarea
                  placeholder="Descripción del trabajo adicional a autorizar…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
                <Textarea
                  placeholder="Información adicional para el cliente (opcional)…"
                  value={estimated}
                  onChange={(e) => setEstimated(e.target.value)}
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={create} disabled={saving || !description.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1"/> : null}Crear solicitud
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">Aún no hay solicitudes de aprobación.</p>
        ) : (
          <div className="space-y-2">
            {items.map((a) => (
              <div key={a.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  {statusBadge(a.status)}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(a.created_at), 'd MMM HH:mm', { locale: es })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{a.description}</p>
                {a.estimated_info && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{a.estimated_info}</p>}
                {a.client_note && (
                  <p className="text-xs italic text-muted-foreground border-l-2 pl-2">"{a.client_note}"</p>
                )}
                {a.client_response_at && (
                  <p className="text-xs text-muted-foreground">
                    Respondido: {format(new Date(a.client_response_at), 'd MMM HH:mm', { locale: es })}
                  </p>
                )}
                {a.status === 'pendiente' && canManage && ownerPhone && (
                  <Button size="sm" variant="outline" onClick={() => shareOnWhatsApp(a)}
                    className="gap-1.5 h-8 text-green-600 border-green-500/30 hover:bg-green-500/10">
                    <MessageCircle className="h-3.5 w-3.5"/> Enviar por WhatsApp
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
