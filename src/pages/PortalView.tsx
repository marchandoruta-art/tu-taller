import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Loader2, Wrench, Clock, CheckCircle2, AlertCircle, Phone, MessageCircle } from 'lucide-react';
import { STATUS_LABELS, VehicleStatus } from '@/lib/types';

interface PortalData {
  vehicle: {
    plate: string;
    brand: string;
    model: string;
    year?: number | null;
    color?: string | null;
    status: VehicleStatus;
    work_summary?: string | null;
    client_tasks?: { text: string; done: boolean }[];
    delivered_at?: string | null;
  };
  workshop: {
    name: string;
    phone?: string;
    whatsapp?: string;
    horario?: string;
  };
  progress: { done: number; total: number };
}

const STATUS_PROGRESS: Record<VehicleStatus, number> = {
  recibido: 10,
  presupuestar: 25,
  presupuestado: 40,
  en_reparacion: 60,
  pendiente_piezas: 50,
  terminado: 90,
  facturado: 95,
  entregado: 100,
};

export default function PortalView() {
  const { token } = useParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-portal-vehicle?token=${encodeURIComponent(token || '')}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || 'Enlace no válido o caducado');
        }
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e?.message || 'Error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-3">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
            <h2 className="text-lg font-semibold">Enlace no disponible</h2>
            <p className="text-sm text-muted-foreground">{error || 'El enlace ha caducado o ha sido revocado por el taller.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { vehicle, workshop, progress } = data;
  const pct = STATUS_PROGRESS[vehicle.status] ?? 0;

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

        {vehicle.work_summary && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" /> Trabajos realizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{vehicle.work_summary}</p>
            </CardContent>
          </Card>
        )}

        {vehicle.client_tasks && vehicle.client_tasks.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Trabajos solicitados
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {progress.done}/{progress.total}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {vehicle.client_tasks.map((t, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    {t.done ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={t.done ? 'line-through text-muted-foreground' : ''}>{t.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contacto del taller</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {workshop.horario && <p className="text-muted-foreground">🕐 {workshop.horario}</p>}
            {workshop.phone && (
              <a href={`tel:${workshop.phone}`} className="flex items-center gap-2 text-primary">
                <Phone className="h-4 w-4" /> {workshop.phone}
              </a>
            )}
            {workshop.whatsapp && (
              <a
                href={`https://wa.me/${workshop.whatsapp.replace(/[\s\-+\(\)]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-green-600"
              >
                <MessageCircle className="h-4 w-4" /> {workshop.whatsapp}
              </a>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground pt-2">
          Esta página se actualiza en tiempo real. Vuelve a abrir el enlace para ver el estado más reciente.
        </p>
      </div>
    </div>
  );
}
