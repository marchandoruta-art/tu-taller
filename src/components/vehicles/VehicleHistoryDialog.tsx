import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Wrench, AlertTriangle, FileText, ArrowRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { STATUS_LABELS, VehicleStatus } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VehicleHistoryDialogProps {
  vehicleId: string | null;
  vehiclePlate?: string;
  onClose: () => void;
}

interface StatusChange {
  id: string;
  old_status: VehicleStatus | null;
  new_status: VehicleStatus;
  changed_by: string | null;
  created_at: string;
  profile_name?: string;
}

interface TimeLogEntry {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  total_minutes: number | null;
  notes: string | null;
  profile_name?: string;
}

interface PartEntry {
  id: string;
  name: string;
  quantity: number;
  unit_price: number | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

interface AnomalyEntry {
  id: string;
  description: string;
  created_at: string;
  profile_name?: string;
  created_by: string | null;
}

export function VehicleHistoryDialog({ vehicleId, vehiclePlate, onClose }: VehicleHistoryDialogProps) {
  const [loading, setLoading] = useState(true);
  const [statusHistory, setStatusHistory] = useState<StatusChange[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
  const [parts, setParts] = useState<PartEntry[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEntry[]>([]);
  const [workSummary, setWorkSummary] = useState<string | null>(null);

  useEffect(() => {
    if (vehicleId) {
      fetchHistory(vehicleId);
    }
  }, [vehicleId]);

  const fetchHistory = async (id: string) => {
    setLoading(true);

    const [vehicleRes, statusRes, timeRes, partsRes, anomaliesRes] = await Promise.all([
      supabase.from('vehicles').select('work_summary').eq('id', id).single(),
      supabase.from('vehicle_status_history').select('*').eq('vehicle_id', id).order('created_at', { ascending: false }),
      supabase.from('time_logs').select('*').eq('vehicle_id', id).order('started_at', { ascending: false }),
      supabase.from('parts').select('*').eq('vehicle_id', id).order('created_at', { ascending: false }),
      supabase.from('vehicle_anomalies').select('*').eq('vehicle_id', id).order('created_at', { ascending: false }),
    ]);

    setWorkSummary(vehicleRes.data?.work_summary || null);

    // Resolve profile names
    const userIds = new Set<string>();
    (statusRes.data || []).forEach(s => s.changed_by && userIds.add(s.changed_by));
    (timeRes.data || []).forEach(t => userIds.add(t.user_id));
    (anomaliesRes.data || []).forEach(a => a.created_by && userIds.add(a.created_by));

    let profileMap: Record<string, string> = {};
    if (userIds.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', Array.from(userIds));
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
      }
    }

    setStatusHistory((statusRes.data || []).map(s => ({
      ...s,
      profile_name: s.changed_by ? profileMap[s.changed_by] : undefined,
    })) as StatusChange[]);

    setTimeLogs((timeRes.data || []).map(t => ({
      ...t,
      profile_name: profileMap[t.user_id] || 'Desconocido',
    })));

    setParts((partsRes.data || []) as PartEntry[]);

    setAnomalies((anomaliesRes.data || []).map(a => ({
      ...a,
      profile_name: a.created_by ? profileMap[a.created_by] : undefined,
    })) as AnomalyEntry[]);

    setLoading(false);
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const totalMinutes = timeLogs.reduce((sum, t) => sum + (t.total_minutes || 0), 0);
  const totalPartsCost = parts.reduce((sum, p) => sum + (p.unit_price || 0) * p.quantity, 0);

  return (
    <Dialog open={!!vehicleId} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico — {vehiclePlate || 'Vehículo'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Tiempo total</p>
                  <p className="text-lg font-bold">{formatTime(totalMinutes)}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Piezas</p>
                  <p className="text-lg font-bold">{parts.length}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Coste piezas</p>
                  <p className="text-lg font-bold">{totalPartsCost > 0 ? `${totalPartsCost.toFixed(2)}€` : '-'}</p>
                </div>
              </div>

              {/* Work Summary */}
              {workSummary && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Resumen de Trabajo
                  </h4>
                  <p className="text-sm bg-muted/50 rounded-md p-3">{workSummary}</p>
                </div>
              )}

              {/* Status History */}
              {statusHistory.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Historial de Estados ({statusHistory.length})
                  </h4>
                  <div className="space-y-2">
                    {statusHistory.map(s => (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <span className="text-xs text-muted-foreground w-28 shrink-0">
                          {format(new Date(s.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                        </span>
                        {s.old_status && (
                          <Badge variant="outline" className="text-xs">{STATUS_LABELS[s.old_status] || s.old_status}</Badge>
                        )}
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <Badge className="text-xs">{STATUS_LABELS[s.new_status] || s.new_status}</Badge>
                        {s.profile_name && (
                          <span className="text-xs text-muted-foreground ml-auto">{s.profile_name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Logs */}
              {timeLogs.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Registros de Tiempo ({timeLogs.length} sesiones — Total: {formatTime(totalMinutes)})
                  </h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Operario</TableHead>
                          <TableHead className="text-xs">Inicio</TableHead>
                          <TableHead className="text-xs">Duración</TableHead>
                          <TableHead className="text-xs">Notas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeLogs.map(t => (
                          <TableRow key={t.id}>
                            <TableCell className="text-sm">{t.profile_name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(t.started_at), 'dd/MM/yy HH:mm', { locale: es })}
                            </TableCell>
                            <TableCell className="text-sm">{t.total_minutes ? formatTime(t.total_minutes) : 'En curso'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{t.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Parts */}
              {parts.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Piezas Utilizadas ({parts.length})
                  </h4>
                  <div className="overflow-x-auto">
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
                        {parts.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm">{p.name}</TableCell>
                            <TableCell className="text-sm">{p.quantity}</TableCell>
                            <TableCell className="text-sm">{p.unit_price ? `${p.unit_price}€` : '-'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{p.reference || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Anomalies */}
              {anomalies.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Anomalías Detectadas ({anomalies.length})
                  </h4>
                  <ul className="space-y-2">
                    {anomalies.map(a => (
                      <li key={a.id} className="text-sm flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <div>
                          <span>{a.description}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {format(new Date(a.created_at), 'dd/MM/yy', { locale: es })}
                            {a.profile_name && ` — ${a.profile_name}`}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Empty state */}
              {statusHistory.length === 0 && timeLogs.length === 0 && parts.length === 0 && anomalies.length === 0 && !workSummary && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay registros de actividad para este vehículo.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
