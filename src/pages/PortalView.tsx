import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Car, Loader2, Wrench, Clock, CheckCircle2, AlertCircle, Phone, MessageCircle, ShieldCheck, XCircle } from 'lucide-react';
import { STATUS_LABELS, VehicleStatus } from '@/lib/types';
import { toast } from 'sonner';

interface Approval {
  id: string;
  description: string;
  estimated_info: string | null;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  created_at: string;
  client_response_at: string | null;
}

interface PortalData {
  vehicle: {
    plate: string; brand: string; model: string;
    year?: number | null; color?: string | null;
    status: VehicleStatus; work_summary?: string | null;
    client_tasks?: { text: string; done: boolean }[];
    delivered_at?: string | null;
  };
  workshop: { name: string; phone?: string; whatsapp?: string; horario?: string; };
  progress: { done: number; total: number };
  approvals?: Approval[];
  portal_token?: string;
}

const STATUS_PROGRESS: Record<VehicleStatus, number> = {
  recibido: 10, presupuestar: 25, presupuestado: 40,
  en_reparacion: 60, pendiente_piezas: 50, terminado: 90,
  facturado: 95, entregado: 100,
};

export default function PortalView() {
  const { token } = useParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-portal-vehicle?token=${encodeURIComponent(token || '')}`;
      const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Enlace no válido o caducado');
      }
      setData(await res.json());
    } catch (e: any) { setError(e?.message || 'Error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const respond = async (approvalId: string, response: 'aprobado' | 'rechazado') => {
    setResponding(approvalId);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/respond-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          portalToken: token,
          approvalId,
          response,
          note: notes[approvalId] || '',
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Error');
      toast.success(response === 'aprobado' ? 'Trabajo aprobado' : 'Trabajo rechazado');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Error al responder');
    } finally { setResponding(null); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full"><CardContent className="py-10 text-center space-y-3">
        <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
        <h2 className="text-lg font-semibold">Enlace no disponible</h2>
        <p className="text-sm text-muted-foreground">{error || 'El enlace ha caducado o ha sido revocado.'}</p>
      </CardContent></Card>
    </div>
  );

  const { vehicle, workshop, progress, approvals = [] } = data;
  const pct = STATUS_PROGRESS[vehicle.status] ?? 0;
  const pending = approvals.filter(a => a.status === 'pendiente');
  const answered = approvals.filter(a => a.status !== 'pendiente');

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="text-center space-y-1">
          <h1 className="text-xl font-bold">{workshop.name}</h1>
          <p className="text-xs text-muted-foreground">Seguimiento de su vehículo</p>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              <span className="font-mono tracking-wider">{vehicle.plate}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {vehicle.brand} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''} {vehicle.color ? `· ${vehicle.color}` : ''}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado actual</span>
                <Badge>{STATUS_LABELS[vehicle.status]}</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-right">{pct}% completado</p>
            </div>
          </CardContent>
        </Card>

        {pending.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600"/>
                Necesitamos su aprobación
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                El taller ha detectado trabajos adicionales. Revíselos y confirme si desea que se realicen.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {pending.map(a => (
                <div key={a.id} className="p-3 rounded-lg bg-background border space-y-2">
                  <p className="text-sm font-medium whitespace-pre-wrap">{a.description}</p>
                  {a.estimated_info && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{a.estimated_info}</p>}
                  <Textarea
                    placeholder="Comentario (opcional)"
                    className="text-sm"
                    value={notes[a.id] || ''}
                    onChange={(e) => setNotes(prev => ({ ...prev, [a.id]: e.target.value }))}
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      disabled={responding === a.id}
                      onClick={() => respond(a.id, 'aprobado')}
                      className="bg-green-600 hover:bg-green-700 text-white h-11">
                      {responding === a.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <><CheckCircle2 className="h-4 w-4 mr-1"/>Aprobar</>}
                    </Button>
                    <Button
                      disabled={responding === a.id}
                      variant="destructive"
                      onClick={() => respond(a.id, 'rechazado')} className="h-11">
                      {responding === a.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <><XCircle className="h-4 w-4 mr-1"/>Rechazar</>}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {answered.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Trabajos adicionales respondidos</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {answered.map(a => (
                <div key={a.id} className="p-2 rounded border text-sm flex items-start gap-2">
                  {a.status === 'aprobado'
                    ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0"/>
                    : <XCircle className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0"/>}
                  <span className={a.status === 'rechazado' ? 'text-muted-foreground line-through' : ''}>{a.description}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {vehicle.work_summary && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" /> Trabajos realizados</CardTitle>
            </CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap text-muted-foreground">{vehicle.work_summary}</p></CardContent>
          </Card>
        )}

        {vehicle.client_tasks && vehicle.client_tasks.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Trabajos solicitados</span>
                <span className="text-sm font-normal text-muted-foreground">{progress.done}/{progress.total}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {vehicle.client_tasks.map((t, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    {t.done ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" /> : <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />}
                    <span className={t.done ? 'line-through text-muted-foreground' : ''}>{t.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Contacto del taller</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {workshop.horario && <p className="text-muted-foreground">🕐 {workshop.horario}</p>}
            {workshop.phone && (
              <a href={`tel:${workshop.phone}`} className="flex items-center gap-2 text-primary">
                <Phone className="h-4 w-4" /> {workshop.phone}
              </a>
            )}
            {workshop.whatsapp && (
              <a href={`https://wa.me/${workshop.whatsapp.replace(/[\s\-+\(\)]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600">
                <MessageCircle className="h-4 w-4" /> {workshop.whatsapp}
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
