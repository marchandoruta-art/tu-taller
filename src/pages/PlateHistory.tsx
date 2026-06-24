import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Car, Clock, Wrench, AlertTriangle, FileText, ArrowRight, Calendar, MessageSquare, Trash2, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { STATUS_LABELS, VehicleStatus } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Match {
  source: 'live' | 'deleted';
  vehicle_id: string;
  plate: string;
  brand: string;
  model: string;
  status?: VehicleStatus;
  archived?: boolean;
  archived_at?: string | null;
  delivered_at?: string | null;
  created_at?: string;
  work_summary?: string | null;
  owner_name?: string | null;
  // snapshots
  parts?: any[];
  time_logs?: any[];
  status_history?: any[];
  anomalies?: any[];
  messages?: any[];
}

export default function PlateHistory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plate, setPlate] = useState(searchParams.get('plate') || '');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [searched, setSearched] = useState(false);

  const search = async (plateToSearch = plate) => {
    const q = plateToSearch.trim().toUpperCase().replace(/[\s-]/g, '');
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const [liveRes, delRes] = await Promise.all([
        supabase
          .from('vehicles')
          .select('*, owner:owners(name)')
          .or(`plate.ilike.%${q}%`)
          .order('created_at', { ascending: false }),
        supabase
          .from('vehicle_archives')
          .select('*')
          .or(`plate.ilike.%${q}%`)
          .order('archived_at', { ascending: false }),
      ]);

      const liveVehicles = liveRes.data || [];
      const results: Match[] = [];

      // Live vehicles: fetch related data
      for (const v of liveVehicles) {
        const [parts, times, status, anomalies, messages] = await Promise.all([
          supabase.from('parts').select('*').eq('vehicle_id', v.id).order('created_at', { ascending: false }),
          supabase.from('time_logs').select('*').eq('vehicle_id', v.id).order('started_at', { ascending: false }),
          supabase.from('vehicle_status_history').select('*').eq('vehicle_id', v.id).order('created_at', { ascending: false }),
          supabase.from('vehicle_anomalies').select('*').eq('vehicle_id', v.id).order('created_at', { ascending: false }),
          supabase.from('vehicle_messages').select('*').eq('vehicle_id', v.id).order('created_at', { ascending: false }),
        ]);

        results.push({
          source: 'live',
          vehicle_id: v.id,
          plate: v.plate,
          brand: v.brand,
          model: v.model,
          status: v.status as VehicleStatus,
          archived: v.archived,
          delivered_at: v.delivered_at,
          created_at: v.created_at,
          work_summary: v.work_summary,
          owner_name: (v as any).owner?.name || null,
          parts: parts.data || [],
          time_logs: times.data || [],
          status_history: status.data || [],
          anomalies: anomalies.data || [],
          messages: messages.data || [],
        });
      }

      // Deleted snapshots
      for (const a of delRes.data || []) {
        const vs: any = a.vehicle_snapshot || {};
        const owner: any = a.owner_snapshot || {};
        results.push({
          source: 'deleted',
          vehicle_id: a.vehicle_id,
          plate: a.plate,
          brand: a.brand,
          model: a.model,
          status: vs.status,
          archived: true,
          archived_at: a.archived_at,
          delivered_at: vs.delivered_at,
          created_at: vs.created_at,
          work_summary: vs.work_summary,
          owner_name: owner?.name || null,
          parts: (a.parts_snapshot as any[]) || [],
          time_logs: (a.time_logs_snapshot as any[]) || [],
          status_history: (a.status_history_snapshot as any[]) || [],
          anomalies: (a.anomalies_snapshot as any[]) || [],
          messages: (a.messages_snapshot as any[]) || [],
        });
      }

      setMatches(results);
      if (results.length === 0) toast.info(`No se encontraron vehículos con matrícula "${q}"`);
    } catch (e: any) {
      toast.error('Error buscando: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const plateFromUrl = searchParams.get('plate');
    if (!plateFromUrl) return;
    const normalized = plateFromUrl.trim().toUpperCase().replace(/[\s-]/g, '');
    setPlate(normalized);
    search(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6" /> Buscar por matrícula
          </h1>
          <p className="text-muted-foreground text-sm">
            Histórico completo de un vehículo (activos, archivados o eliminados).
          </p>
        </div>

        <div className="flex gap-2 max-w-xl">
          <Input
            placeholder="Introduce la matrícula (ej. 1234ABC)"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className="uppercase font-mono text-base"
            autoFocus
          />
          <Button onClick={search} disabled={loading || !plate.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Buscar</span>
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && searched && matches.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            No se encontró ningún vehículo con esa matrícula.
          </Card>
        )}

        {!loading && matches.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {matches.length} resultado{matches.length !== 1 ? 's' : ''} encontrado{matches.length !== 1 ? 's' : ''}
          </p>
        )}

        <div className="space-y-6">
          {matches.map((m, idx) => {
            const totalMin = (m.time_logs || []).reduce((s: number, t: any) => s + (t.total_minutes || 0), 0);
            const totalParts = (m.parts || []).reduce((s: number, p: any) => s + (p.unit_price || 0) * (p.quantity || 0), 0);

            return (
              <Card key={`${m.source}-${m.vehicle_id}-${idx}`} className="p-5 space-y-5">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Car className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-bold font-mono">{m.plate}</h2>
                      <span className="text-muted-foreground">— {m.brand} {m.model}</span>
                    </div>
                    {m.owner_name && (
                      <p className="text-sm text-muted-foreground mt-1">Propietario: {m.owner_name}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {m.source === 'deleted' ? (
                        <Badge variant="destructive" className="gap-1"><Trash2 className="h-3 w-3" /> Eliminado</Badge>
                      ) : m.archived ? (
                        <Badge variant="secondary" className="gap-1"><Archive className="h-3 w-3" /> Archivado</Badge>
                      ) : (
                        <Badge>Activo</Badge>
                      )}
                      {m.status && <Badge variant="outline">{STATUS_LABELS[m.status] || m.status}</Badge>}
                      {m.archived_at && (
                        <span className="text-xs text-muted-foreground self-center">
                          Eliminado: {format(new Date(m.archived_at), 'dd/MM/yy HH:mm', { locale: es })}
                        </span>
                      )}
                      {m.delivered_at && (
                        <span className="text-xs text-muted-foreground self-center">
                          Entregado: {format(new Date(m.delivered_at), 'dd/MM/yy', { locale: es })}
                        </span>
                      )}
                    </div>
                  </div>
                  {m.source === 'live' && (
                    <Button size="sm" variant="outline" onClick={() => navigate(`/vehicles/${m.vehicle_id}`)}>
                      Abrir ficha
                    </Button>
                  )}
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Tiempo total</p>
                    <p className="text-lg font-bold">{formatTime(totalMin)}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Piezas</p>
                    <p className="text-lg font-bold">{m.parts?.length || 0}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Coste piezas</p>
                    <p className="text-lg font-bold">{totalParts > 0 ? `${totalParts.toFixed(2)}€` : '-'}</p>
                  </div>
                </div>

                {/* Work summary */}
                {m.work_summary && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Resumen de trabajo
                    </h4>
                    <p className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">{m.work_summary}</p>
                  </div>
                )}

                {/* Status history */}
                {m.status_history && m.status_history.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Historial de estados ({m.status_history.length})
                    </h4>
                    <div className="space-y-1.5">
                      {m.status_history.map((s: any) => (
                        <div key={s.id} className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="text-xs text-muted-foreground w-28 shrink-0">
                            {format(new Date(s.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                          </span>
                          {s.old_status && (
                            <Badge variant="outline" className="text-xs">{STATUS_LABELS[s.old_status as VehicleStatus] || s.old_status}</Badge>
                          )}
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <Badge className="text-xs">{STATUS_LABELS[s.new_status as VehicleStatus] || s.new_status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time logs */}
                {m.time_logs && m.time_logs.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Registros de tiempo ({m.time_logs.length} — {formatTime(totalMin)})
                    </h4>
                    <ScrollArea className="max-h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Inicio</TableHead>
                            <TableHead className="text-xs">Duración</TableHead>
                            <TableHead className="text-xs">Notas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {m.time_logs.map((t: any) => (
                            <TableRow key={t.id}>
                              <TableCell className="text-xs">{format(new Date(t.started_at), 'dd/MM/yy HH:mm', { locale: es })}</TableCell>
                              <TableCell className="text-sm">{t.total_minutes ? formatTime(t.total_minutes) : 'En curso'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{t.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}

                {/* Parts */}
                {m.parts && m.parts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <Wrench className="h-3 w-3" /> Piezas y materiales ({m.parts.length})
                    </h4>
                    <ScrollArea className="max-h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Pieza</TableHead>
                            <TableHead className="text-xs">Cant.</TableHead>
                            <TableHead className="text-xs">Precio</TableHead>
                            <TableHead className="text-xs">Ref.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {m.parts.map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell className="text-sm">{p.name}</TableCell>
                              <TableCell className="text-sm">{p.quantity}</TableCell>
                              <TableCell className="text-sm">{p.unit_price ? `${p.unit_price}€` : '-'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{p.reference || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}

                {/* Anomalies */}
                {m.anomalies && m.anomalies.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Anomalías ({m.anomalies.length})
                    </h4>
                    <ul className="space-y-1.5">
                      {m.anomalies.map((a: any) => (
                        <li key={a.id} className="text-sm flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          <div>
                            <span>{a.description}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {format(new Date(a.created_at), 'dd/MM/yy', { locale: es })}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Messages */}
                {m.messages && m.messages.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Comentarios internos ({m.messages.length})
                    </h4>
                    <ScrollArea className="max-h-48">
                      <ul className="space-y-2">
                        {m.messages.map((msg: any) => (
                          <li key={msg.id} className="text-sm bg-muted/30 rounded p-2">
                            <p>{msg.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(msg.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}

                {/* Empty state */}
                {!m.work_summary &&
                  (!m.status_history || m.status_history.length === 0) &&
                  (!m.time_logs || m.time_logs.length === 0) &&
                  (!m.parts || m.parts.length === 0) &&
                  (!m.anomalies || m.anomalies.length === 0) &&
                  (!m.messages || m.messages.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sin actividad registrada para este vehículo.
                    </p>
                  )}
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
