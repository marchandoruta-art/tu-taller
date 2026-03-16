import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VehicleWithOwner, VehicleStatus, STATUS_LABELS } from '@/lib/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { History, Search, Loader2, Eye, Trash2, RotateCcw, Car, ChevronDown, ChevronRight, Clock, Wrench, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ArchivedVehicle extends VehicleWithOwner {
  parts_list?: { id: string; name: string; quantity: number; reference?: string | null; notes?: string | null }[];
  anomalies_list?: { id: string; description: string; created_at: string }[];
  time_logs_list?: { id: string; user_id: string; started_at: string; ended_at?: string | null; total_minutes: number | null; notes?: string | null; profile_name?: string }[];
  total_work_minutes?: number;
}

export default function RepairHistory() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [vehicles, setVehicles] = useState<ArchivedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const isAdmin = role === 'admin';

  useEffect(() => {
    fetchArchivedVehicles();
  }, []);

  const fetchArchivedVehicles = async () => {
    const { data: vehiclesData, error } = await supabase
      .from('vehicles')
      .select('*, owner:owners(*)')
      .eq('archived', true)
      .order('delivered_at', { ascending: false });

    if (error) {
      console.error('Error fetching archived vehicles:', error);
      setLoading(false);
      return;
    }

    if (!vehiclesData || vehiclesData.length === 0) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    const vehicleIds = vehiclesData.map(v => v.id);

    const [partsRes, anomaliesRes, timeLogsRes] = await Promise.all([
      supabase.from('parts').select('id, name, quantity, reference, notes, vehicle_id').in('vehicle_id', vehicleIds),
      supabase.from('vehicle_anomalies').select('id, description, created_at, vehicle_id').in('vehicle_id', vehicleIds),
      supabase.from('time_logs').select('id, user_id, started_at, ended_at, total_minutes, notes, vehicle_id').in('vehicle_id', vehicleIds),
    ]);

    // Fetch profile names for time logs
    const userIds = [...new Set((timeLogsRes.data || []).map(t => t.user_id))];
    let profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
      }
    }

    const enriched: ArchivedVehicle[] = vehiclesData.map(v => {
      const parts = (partsRes.data || []).filter(p => p.vehicle_id === v.id);
      const anomalies = (anomaliesRes.data || []).filter(a => a.vehicle_id === v.id);
      const timeLogs = (timeLogsRes.data || []).filter(t => t.vehicle_id === v.id);
      const totalMinutes = timeLogs.reduce((sum, t) => sum + (t.total_minutes || 0), 0);

      return {
        ...v,
        parts_list: parts,
        anomalies_list: anomalies,
        time_logs_list: timeLogs.map(t => ({ ...t, profile_name: profileMap[t.user_id] || 'Desconocido' })),
        total_work_minutes: totalMinutes,
      } as ArchivedVehicle;
    });

    setVehicles(enriched);
    setLoading(false);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const deleteVehicle = async (vehicleId: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
    if (error) {
      toast.error('Error al eliminar el vehículo');
    } else {
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      toast.success('Vehículo eliminado del historial');
    }
  };

  const restoreVehicle = async (vehicleId: string) => {
    const { error } = await supabase.from('vehicles').update({ archived: false, status: 'recibido' as VehicleStatus }).eq('id', vehicleId);
    if (error) {
      toast.error('Error al restaurar el vehículo');
    } else {
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      toast.success('Vehículo restaurado al taller');
    }
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getYears = () => {
    const years = new Set(vehicles.map(v =>
      v.delivered_at ? new Date(v.delivered_at).getFullYear() : new Date(v.created_at).getFullYear()
    ));
    return Array.from(years).sort((a, b) => b - a);
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      vehicle.plate.toLowerCase().includes(searchLower) ||
      vehicle.brand.toLowerCase().includes(searchLower) ||
      vehicle.model.toLowerCase().includes(searchLower) ||
      vehicle.owner?.name?.toLowerCase().includes(searchLower);

    const vehicleYear = vehicle.delivered_at
      ? new Date(vehicle.delivered_at).getFullYear().toString()
      : new Date(vehicle.created_at).getFullYear().toString();
    const matchesYear = yearFilter === 'all' || vehicleYear === yearFilter;

    return matchesSearch && matchesYear;
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Historial de Reparaciones</h1>
              <p className="text-sm text-muted-foreground">
                {vehicles.length} reparaciones archivadas
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por matrícula, marca, modelo o cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los años</SelectItem>
                  {getYears().map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle List */}
        {filteredVehicles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay reparaciones en el historial</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id}>
                <CardContent className="p-0">
                  <Collapsible open={expandedIds.has(vehicle.id)} onOpenChange={() => toggleExpanded(vehicle.id)}>
                    {/* Row header */}
                    <div className="flex items-center gap-3 p-4">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          {expandedIds.has(vehicle.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm">{vehicle.plate}</span>
                          <span className="text-sm text-muted-foreground">{vehicle.brand} {vehicle.model}</span>
                          {vehicle.owner?.name && (
                            <span className="text-xs text-muted-foreground">• {vehicle.owner.name}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {vehicle.delivered_at && (
                            <span>Entregado: {format(new Date(vehicle.delivered_at), 'dd MMM yyyy', { locale: es })}</span>
                          )}
                          {(vehicle.total_work_minutes ?? 0) > 0 && (
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(vehicle.total_work_minutes!)}</span>
                          )}
                          {(vehicle.parts_list?.length ?? 0) > 0 && (
                            <span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> {vehicle.parts_list!.length} piezas</span>
                          )}
                          {(vehicle.anomalies_list?.length ?? 0) > 0 && (
                            <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {vehicle.anomalies_list!.length} anomalías</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/vehicles/${vehicle.id}`)} title="Ver ficha completa">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => restoreVehicle(vehicle.id)} title="Restaurar">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Eliminar">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar vehículo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Se eliminará permanentemente {vehicle.plate} y toda su información.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteVehicle(vehicle.id)}>
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    <CollapsibleContent>
                      <div className="border-t px-4 pb-4 pt-3 space-y-4 bg-muted/30">
                        {/* Work Summary */}
                        {vehicle.work_summary && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                              <FileText className="h-3 w-3" /> Resumen de Trabajo
                            </h4>
                            <p className="text-sm">{vehicle.work_summary}</p>
                          </div>
                        )}

                        {/* Client Description */}
                        {vehicle.client_description && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Descripción del Cliente</h4>
                            <p className="text-sm">{vehicle.client_description}</p>
                          </div>
                        )}

                        {/* Parts */}
                        {vehicle.parts_list && vehicle.parts_list.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                              <Wrench className="h-3 w-3" /> Piezas Utilizadas ({vehicle.parts_list.length})
                            </h4>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Pieza</TableHead>
                                    <TableHead className="text-xs">Cant.</TableHead>
                                    <TableHead className="text-xs">Referencia</TableHead>
                                    <TableHead className="text-xs">Notas</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {vehicle.parts_list.map(part => (
                                    <TableRow key={part.id}>
                                      <TableCell className="text-sm">{part.name}</TableCell>
                                      <TableCell className="text-sm">{part.quantity}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{part.reference || '-'}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{part.notes || '-'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* Anomalies */}
                        {vehicle.anomalies_list && vehicle.anomalies_list.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Anomalías Detectadas ({vehicle.anomalies_list.length})
                            </h4>
                            <ul className="space-y-1">
                              {vehicle.anomalies_list.map(a => (
                                <li key={a.id} className="text-sm flex items-start gap-2">
                                  <span className="text-muted-foreground">•</span>
                                  <span>{a.description}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Time Logs */}
                        {vehicle.time_logs_list && vehicle.time_logs_list.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Registro de Tiempos ({vehicle.time_logs_list.length} sesiones — Total: {formatTime(vehicle.total_work_minutes || 0)})
                            </h4>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Operario</TableHead>
                                    <TableHead className="text-xs">Inicio</TableHead>
                                    <TableHead className="text-xs">Fin</TableHead>
                                    <TableHead className="text-xs">Duración</TableHead>
                                    <TableHead className="text-xs">Notas</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {vehicle.time_logs_list.map(log => (
                                    <TableRow key={log.id}>
                                      <TableCell className="text-sm">{log.profile_name}</TableCell>
                                      <TableCell className="text-sm">{format(new Date(log.started_at), 'dd/MM HH:mm', { locale: es })}</TableCell>
                                      <TableCell className="text-sm">{log.ended_at ? format(new Date(log.ended_at), 'dd/MM HH:mm', { locale: es }) : 'En curso'}</TableCell>
                                      <TableCell className="text-sm">{log.total_minutes ? formatTime(log.total_minutes) : '-'}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{log.notes || '-'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* Owner info */}
                        {vehicle.owner && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Propietario</h4>
                            <div className="text-sm space-y-0.5">
                              <p>{vehicle.owner.name}</p>
                              {vehicle.owner.phone && <p className="text-muted-foreground">Tel: {vehicle.owner.phone}</p>}
                              {vehicle.owner.email && <p className="text-muted-foreground">Email: {vehicle.owner.email}</p>}
                              {vehicle.owner.dni && <p className="text-muted-foreground">DNI: {vehicle.owner.dni}</p>}
                            </div>
                          </div>
                        )}

                        {/* Empty state */}
                        {!vehicle.work_summary && !vehicle.client_description && 
                         (!vehicle.parts_list || vehicle.parts_list.length === 0) && 
                         (!vehicle.anomalies_list || vehicle.anomalies_list.length === 0) && 
                         (!vehicle.time_logs_list || vehicle.time_logs_list.length === 0) && (
                          <p className="text-sm text-muted-foreground italic">No hay información de trabajo registrada para este vehículo.</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
