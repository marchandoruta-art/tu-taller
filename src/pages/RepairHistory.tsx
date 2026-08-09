import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { History, Search, Loader2, Eye, Trash2, RotateCcw, Car, ChevronDown, ChevronRight, Clock, Wrench, AlertTriangle, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { deleteVehiclePermanently } from '@/lib/deleteVehicle';
import { downloadCsv, formatMinutes } from '@/lib/exportCsv';

interface ArchivedVehicle extends VehicleWithOwner {
  parts_list?: { id: string; name: string; quantity: number; reference?: string | null; notes?: string | null }[];
  anomalies_list?: { id: string; description: string; created_at: string }[];
  time_logs_list?: { id: string; user_id: string; started_at: string; ended_at?: string | null; total_minutes: number | null; notes?: string | null; profile_name?: string }[];
  total_work_minutes?: number;
  source?: 'archived' | 'deleted';
  archived_at?: string;
}

export default function RepairHistory() {
  const { t } = useTranslation();
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
    const [archivedRes, deletedRes] = await Promise.all([
      supabase.from('vehicles').select('*, owner:owners(*)').eq('archived', true).order('delivered_at', { ascending: false }),
      supabase.from('vehicle_archives').select('*').order('archived_at', { ascending: false }),
    ]);

    const vehiclesData = archivedRes.data || [];
    const archivesData = deletedRes.data || [];

    // Profiles map for time logs (collect all user_ids upfront)
    const collectedUserIds = new Set<string>();

    // Fetch related data for live archived vehicles
    const vehicleIds = vehiclesData.map((v: any) => v.id);
    let partsRes: any = { data: [] }, anomaliesRes: any = { data: [] }, timeLogsRes: any = { data: [] };
    if (vehicleIds.length > 0) {
      [partsRes, anomaliesRes, timeLogsRes] = await Promise.all([
        supabase.from('parts').select('id, name, quantity, reference, notes, vehicle_id').in('vehicle_id', vehicleIds),
        supabase.from('vehicle_anomalies').select('id, description, created_at, vehicle_id').in('vehicle_id', vehicleIds),
        supabase.from('time_logs').select('id, user_id, started_at, ended_at, total_minutes, notes, vehicle_id').in('vehicle_id', vehicleIds),
      ]);
    }
    (timeLogsRes.data || []).forEach((t: any) => collectedUserIds.add(t.user_id));
    archivesData.forEach((a: any) => {
      (a.time_logs_snapshot || []).forEach((t: any) => t?.user_id && collectedUserIds.add(t.user_id));
    });

    let profileMap: Record<string, string> = {};
    if (collectedUserIds.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', Array.from(collectedUserIds));
      if (profiles) profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p.full_name]));
    }

    const liveArchived: ArchivedVehicle[] = vehiclesData.map((v: any) => {
      const parts = (partsRes.data || []).filter((p: any) => p.vehicle_id === v.id);
      const anomalies = (anomaliesRes.data || []).filter((a: any) => a.vehicle_id === v.id);
      const timeLogs = (timeLogsRes.data || []).filter((t: any) => t.vehicle_id === v.id);
      const totalMinutes = timeLogs.reduce((sum: number, t: any) => sum + (t.total_minutes || 0), 0);
      return {
        ...v,
        parts_list: parts,
        anomalies_list: anomalies,
        time_logs_list: timeLogs.map((tl: any) => ({ ...tl, profile_name: profileMap[tl.user_id] || t('authUI.repairHistory.unknownOperator') })),
        total_work_minutes: totalMinutes,
        source: 'archived' as const,
      } as ArchivedVehicle;
    });

    const deletedItems: ArchivedVehicle[] = archivesData.map((a: any) => {
      const snap = a.vehicle_snapshot || {};
      const parts = a.parts_snapshot || [];
      const anomalies = a.anomalies_snapshot || [];
      const timeLogs = a.time_logs_snapshot || [];
      const totalMinutes = timeLogs.reduce((sum: number, t: any) => sum + (t?.total_minutes || 0), 0);
      return {
        ...snap,
        id: a.vehicle_id,
        plate: a.plate || snap.plate,
        brand: a.brand || snap.brand,
        model: a.model || snap.model,
        organization_id: a.organization_id,
        owner: a.owner_snapshot || null,
        parts_list: parts,
        anomalies_list: anomalies,
        time_logs_list: timeLogs.map((tl: any) => ({ ...tl, profile_name: profileMap[tl?.user_id] || t('authUI.repairHistory.unknownOperator') })),
        total_work_minutes: totalMinutes,
        source: 'deleted' as const,
        archived_at: a.archived_at,
      } as ArchivedVehicle;
    });

    // Merge & sort by archived_at/delivered_at desc
    const merged = [...liveArchived, ...deletedItems].sort((a, b) => {
      const da = new Date(a.archived_at || a.delivered_at || a.created_at).getTime();
      const db = new Date(b.archived_at || b.delivered_at || b.created_at).getTime();
      return db - da;
    });

    setVehicles(merged);
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
    const { error } = await deleteVehiclePermanently(vehicleId);
    if (error) {
      toast.error(t('authUI.repairHistory.deleteError'));
    } else {
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      toast.success(t('authUI.repairHistory.deleteSuccess'));
    }
  };

  const restoreVehicle = async (vehicleId: string) => {
    const { error } = await supabase.from('vehicles').update({ archived: false, status: 'recibido' as VehicleStatus }).eq('id', vehicleId);
    if (error) {
      toast.error(t('authUI.repairHistory.restoreError'));
    } else {
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      toast.success(t('authUI.repairHistory.restoreSuccess'));
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
              <h1 className="text-2xl font-bold">{t('authUI.repairHistory.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('authUI.repairHistory.count', { count: vehicles.length })}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              if (filteredVehicles.length === 0) return toast.info(t('authUI.repairHistory.nothingToExport'));
              downloadCsv('historial-reparaciones', filteredVehicles, [
                { key: 'plate', label: t('authUI.repairHistory.csv.plate'), value: (v) => v.plate },
                { key: 'brand', label: t('authUI.repairHistory.csv.brand'), value: (v) => v.brand },
                { key: 'model', label: t('authUI.repairHistory.csv.model'), value: (v) => v.model },
                { key: 'owner', label: t('authUI.repairHistory.csv.client'), value: (v) => v.owner?.name || '' },
                { key: 'phone', label: t('authUI.repairHistory.csv.phone'), value: (v) => v.owner?.phone || '' },
                { key: 'status', label: t('authUI.repairHistory.csv.status'), value: (v) => STATUS_LABELS[v.status] || v.status },
                { key: 'source', label: t('authUI.repairHistory.csv.source'), value: (v) => (v.source === 'deleted' ? t('authUI.repairHistory.csv.sourceDeleted') : t('authUI.repairHistory.csv.sourceArchived')) },
                { key: 'time', label: t('authUI.repairHistory.csv.time'), value: (v) => formatMinutes(v.total_work_minutes || 0) },
                { key: 'parts_count', label: t('authUI.repairHistory.csv.partsCount'), value: (v) => v.parts_list?.length || 0 },
                { key: 'work_summary', label: t('authUI.repairHistory.csv.summary'), value: (v) => v.work_summary || '' },
                { key: 'delivered_at', label: t('authUI.repairHistory.csv.delivered'), value: (v) => v.delivered_at ? format(new Date(v.delivered_at), 'dd/MM/yyyy') : '' },
                { key: 'archived_at', label: t('authUI.repairHistory.csv.archived'), value: (v) => v.archived_at ? format(new Date(v.archived_at), 'dd/MM/yyyy HH:mm') : '' },
              ]);
            }}
          >
            <Download className="h-4 w-4" /> {t('authUI.repairHistory.exportCsv')}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('authUI.repairHistory.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('authUI.repairHistory.filterByYear')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('authUI.repairHistory.allYears')}</SelectItem>
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
              <p className="text-muted-foreground">{t('authUI.repairHistory.empty')}</p>
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
                          {vehicle.source === 'deleted' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive uppercase tracking-wide">
                              {t('authUI.repairHistory.deletedTag')}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {vehicle.source === 'deleted' && vehicle.archived_at ? (
                            <span>{t('authUI.repairHistory.deletedAt', { date: format(new Date(vehicle.archived_at), 'dd MMM yyyy', { locale: es }) })}</span>
                          ) : vehicle.delivered_at && (
                            <span>{t('authUI.repairHistory.deliveredAt', { date: format(new Date(vehicle.delivered_at), 'dd MMM yyyy', { locale: es }) })}</span>
                          )}
                          {(vehicle.total_work_minutes ?? 0) > 0 && (
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(vehicle.total_work_minutes!)}</span>
                          )}
                          {(vehicle.parts_list?.length ?? 0) > 0 && (
                            <span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> {t('authUI.repairHistory.partsCount', { count: vehicle.parts_list!.length })}</span>
                          )}
                          {(vehicle.anomalies_list?.length ?? 0) > 0 && (
                            <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {t('authUI.repairHistory.anomaliesCount', { count: vehicle.anomalies_list!.length })}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {vehicle.source !== 'deleted' && (
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/vehicles/${vehicle.id}`)} title={t('authUI.repairHistory.viewFullRecord')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && vehicle.source !== 'deleted' && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => restoreVehicle(vehicle.id)} title={t('authUI.repairHistory.restore')}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title={t('authUI.repairHistory.delete')}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('authUI.repairHistory.confirmDeleteTitle')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('authUI.repairHistory.confirmDeleteDescription', { plate: vehicle.plate })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('authUI.repairHistory.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteVehicle(vehicle.id)}>
                                    {t('authUI.repairHistory.delete')}
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
                              <FileText className="h-3 w-3" /> {t('authUI.repairHistory.workSummary')}
                            </h4>
                            <p className="text-sm">{vehicle.work_summary}</p>
                          </div>
                        )}

                        {/* Client Description */}
                        {vehicle.client_description && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">{t('authUI.repairHistory.clientDescription')}</h4>
                            <p className="text-sm">{vehicle.client_description}</p>
                          </div>
                        )}

                        {/* Parts */}
                        {vehicle.parts_list && vehicle.parts_list.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                              <Wrench className="h-3 w-3" /> {t('authUI.repairHistory.partsUsed', { count: vehicle.parts_list.length })}
                            </h4>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">{t('authUI.repairHistory.part')}</TableHead>
                                    <TableHead className="text-xs">{t('authUI.repairHistory.quantity')}</TableHead>
                                    <TableHead className="text-xs">{t('authUI.repairHistory.reference')}</TableHead>
                                    <TableHead className="text-xs">{t('authUI.repairHistory.notes')}</TableHead>
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
                              <AlertTriangle className="h-3 w-3" /> {t('authUI.repairHistory.anomaliesDetected', { count: vehicle.anomalies_list.length })}
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
                              <Clock className="h-3 w-3" /> {t('authUI.repairHistory.timeLog', { count: vehicle.time_logs_list.length, time: formatTime(vehicle.total_work_minutes || 0) })}
                            </h4>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">{t('authUI.repairHistory.operator')}</TableHead>
                                    <TableHead className="text-xs">{t('authUI.repairHistory.start')}</TableHead>
                                    <TableHead className="text-xs">{t('authUI.repairHistory.end')}</TableHead>
                                    <TableHead className="text-xs">{t('authUI.repairHistory.duration')}</TableHead>
                                    <TableHead className="text-xs">{t('authUI.repairHistory.notes')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {vehicle.time_logs_list.map(log => (
                                    <TableRow key={log.id}>
                                      <TableCell className="text-sm">{log.profile_name}</TableCell>
                                      <TableCell className="text-sm">{format(new Date(log.started_at), 'dd/MM HH:mm', { locale: es })}</TableCell>
                                      <TableCell className="text-sm">{log.ended_at ? format(new Date(log.ended_at), 'dd/MM HH:mm', { locale: es }) : t('authUI.repairHistory.inProgress')}</TableCell>
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
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">{t('authUI.repairHistory.owner')}</h4>
                            <div className="text-sm space-y-0.5">
                              <p>{vehicle.owner.name}</p>
                              {vehicle.owner.phone && <p className="text-muted-foreground">{t('authUI.repairHistory.phone', { phone: vehicle.owner.phone })}</p>}
                              {vehicle.owner.email && <p className="text-muted-foreground">{t('authUI.repairHistory.email', { email: vehicle.owner.email })}</p>}
                              {vehicle.owner.dni && <p className="text-muted-foreground">{t('authUI.repairHistory.dni', { dni: vehicle.owner.dni })}</p>}
                            </div>
                          </div>
                        )}

                        {/* Empty state */}
                        {!vehicle.work_summary && !vehicle.client_description && 
                         (!vehicle.parts_list || vehicle.parts_list.length === 0) && 
                         (!vehicle.anomalies_list || vehicle.anomalies_list.length === 0) && 
                         (!vehicle.time_logs_list || vehicle.time_logs_list.length === 0) && (
                          <p className="text-sm text-muted-foreground italic">{t('authUI.repairHistory.noWorkInfo')}</p>
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
