import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { VehicleWithOwner, VehicleStatus, Profile, VehiclePriority, PRIORITY_ORDER, PRIORITY_LABELS } from '@/lib/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusColumn } from '@/components/dashboard/StatusColumn';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { NewVehicleDialog } from '@/components/vehicles/NewVehicleDialog';
import { QuickPlateDialog } from '@/components/vehicles/QuickPlateDialog';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { Loader2, Car, Clock, Wrench, CheckCircle, PackageCheck, BarChart2, LayoutGrid, List, Download, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VehicleStatusBadge } from '@/components/vehicles/VehicleStatusBadge';
import { PriorityBadge } from '@/components/vehicles/PrioritySelector';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS } from '@/lib/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { downloadCsv, formatMinutes } from '@/lib/exportCsv';

const statusOrder: VehicleStatus[] = ['recibido', 'en_reparacion', 'presupuestar', 'presupuestado', 'pendiente_piezas', 'terminado', 'facturado', 'entregado'];
type ViewMode = 'kanban' | 'charts' | 'list';
type StatusFilter = 'all' | 'en_taller' | VehicleStatus;
type PriorityFilter = 'all' | 'urgent_high' | VehiclePriority;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { organizationId } = useOrganization();
  const [vehicles, setVehicles] = useState<VehicleWithOwner[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [vehicleTimes, setVehicleTimes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const appointmentsConverted = useRef(false);

  // Auto-convert today's appointments into vehicles (server-side, respects RLS via SECURITY DEFINER)
  const convertTodayAppointments = async () => {
    if (appointmentsConverted.current || !user || !organizationId) return;
    appointmentsConverted.current = true;

    const { data: created, error } = await supabase.rpc('convert_today_appointments');
    if (error) {
      console.error('Error converting appointments:', error);
      return;
    }
    if (created && created > 0) {
      toast.success(`${created} vehículo${created > 1 ? 's' : ''} creado${created > 1 ? 's' : ''} desde citas de hoy`);
    }
  };

  const fetchVehicles = async () => {
    // First, archive old delivered vehicles
    await supabase.rpc('archive_old_delivered_vehicles');
    
    const { data } = await supabase
      .from('vehicles')
      .select('*, owner:owners(*)')
      .eq('archived', false)
      .order('created_at', { ascending: false });

    if (data) {
      setVehicles(data as any);
      // Fetch profiles for assigned users
      const assignedIds = [...new Set(data.filter((v: any) => v.assigned_to).map((v: any) => v.assigned_to))];
      if (assignedIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', assignedIds);
        if (profilesData) {
          const map: Record<string, string> = {};
          profilesData.forEach((p) => { map[p.user_id] = p.full_name; });
          setProfiles(map);
        }
      }
      // Fetch time totals per vehicle
      const vehicleIds = data.map((v: any) => v.id);
      if (vehicleIds.length > 0) {
        const { data: timeLogs } = await supabase
          .from('time_logs')
          .select('vehicle_id, total_minutes')
          .in('vehicle_id', vehicleIds);
        if (timeLogs) {
          const timeMap: Record<string, number> = {};
          timeLogs.forEach((t) => {
            timeMap[t.vehicle_id] = (timeMap[t.vehicle_id] || 0) + (t.total_minutes || 0);
          });
          setVehicleTimes(timeMap);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      await convertTodayAppointments();
      await fetchVehicles();
    };
    init();
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as VehicleStatus;
    const vehicleId = result.draggableId;
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle || vehicle.status === newStatus) return;

    // Optimistic update
    setVehicles((prev) => prev.map((v) => v.id === vehicleId ? { ...v, status: newStatus } : v));

    const { error } = await supabase.from('vehicles').update({ status: newStatus }).eq('id', vehicleId);
    if (error) {
      toast.error('Error al mover vehículo');
      fetchVehicles();
    } else {
      toast.success(`${vehicle.plate} → ${STATUS_LABELS[newStatus]}`);
    }
  };

  const getVehiclesByStatus = (status: VehicleStatus) => {
    return vehicles.filter((v) => v.status === status);
  };

  const stats: { label: string; value: number; icon: any; color: string; filter: StatusFilter }[] = [
    {
      label: 'En Taller',
      value: vehicles.filter((v) => v.status !== 'terminado' && v.status !== 'entregado').length,
      icon: Car,
      color: 'text-primary',
      filter: 'en_taller',
    },
    {
      label: 'En Reparación',
      value: vehicles.filter((v) => v.status === 'en_reparacion').length,
      icon: Wrench,
      color: 'text-status-in-progress',
      filter: 'en_reparacion' as VehicleStatus,
    },
    {
      label: 'Presupuestar',
      value: vehicles.filter((v) => v.status === 'presupuestar').length,
      icon: Clock,
      color: 'text-status-pending-parts',
      filter: 'presupuestar' as VehicleStatus,
    },
    {
      label: 'Presupuestado',
      value: vehicles.filter((v) => v.status === 'presupuestado').length,
      icon: CheckCircle,
      color: 'text-status-completed',
      filter: 'presupuestado' as VehicleStatus,
    },
    {
      label: 'Pendiente Piezas',
      value: vehicles.filter((v) => v.status === 'pendiente_piezas').length,
      icon: Clock,
      color: 'text-status-pending-parts',
      filter: 'pendiente_piezas' as VehicleStatus,
    },
    {
      label: 'Terminados',
      value: vehicles.filter((v) => v.status === 'terminado').length,
      icon: CheckCircle,
      color: 'text-status-completed',
      filter: 'terminado' as VehicleStatus,
    },
    {
      label: 'Facturados',
      value: vehicles.filter((v) => v.status === 'facturado').length,
      icon: CheckCircle,
      color: 'text-status-invoiced',
      filter: 'facturado' as VehicleStatus,
    },
    {
      label: 'Entregados',
      value: vehicles.filter((v) => v.status === 'entregado').length,
      icon: PackageCheck,
      color: 'text-status-delivered',
      filter: 'entregado' as VehicleStatus,
    },
  ];

  const matchesPriority = (v: VehicleWithOwner) => {
    const p = (v.priority as VehiclePriority) || 'normal';
    if (priorityFilter === 'all') return true;
    if (priorityFilter === 'urgent_high') return p === 'urgente' || p === 'alta';
    return p === priorityFilter;
  };

  const sortByPriority = (a: VehicleWithOwner, b: VehicleWithOwner) => {
    const pa = PRIORITY_ORDER[(a.priority as VehiclePriority) || 'normal'];
    const pb = PRIORITY_ORDER[(b.priority as VehiclePriority) || 'normal'];
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };

  const baseFiltered = statusFilter === 'all'
    ? vehicles
    : statusFilter === 'en_taller'
    ? vehicles.filter(v => v.status !== 'terminado' && v.status !== 'entregado')
    : vehicles.filter(v => v.status === statusFilter);

  const filteredVehicles = baseFiltered.filter(matchesPriority).sort(sortByPriority);

  const filteredStatusOrder = statusFilter === 'all'
    ? statusOrder
    : statusFilter === 'en_taller'
    ? statusOrder.filter(s => s !== 'terminado' && s !== 'entregado')
    : statusOrder.filter(s => s === statusFilter);

  const getVehiclesByStatusFiltered = (status: VehicleStatus) =>
    filteredVehicles.filter(v => v.status === status);

  const handleExport = () => {
    if (filteredVehicles.length === 0) {
      toast.info('Nada que exportar');
      return;
    }
    downloadCsv('vehiculos', filteredVehicles, [
      { key: 'plate', label: 'Matrícula', value: (v) => v.plate },
      { key: 'brand', label: 'Marca', value: (v) => v.brand },
      { key: 'model', label: 'Modelo', value: (v) => v.model },
      { key: 'status', label: 'Estado', value: (v) => STATUS_LABELS[v.status] },
      { key: 'priority', label: 'Prioridad', value: (v) => PRIORITY_LABELS[(v.priority as VehiclePriority) || 'normal'] },
      { key: 'owner', label: 'Cliente', value: (v) => v.owner?.name || '' },
      { key: 'phone', label: 'Teléfono', value: (v) => v.owner?.phone || '' },
      { key: 'assigned', label: 'Asignado a', value: (v) => v.assigned_to ? profiles[v.assigned_to] || '' : '' },
      { key: 'description', label: 'Descripción', value: (v) => v.client_description || '' },
      { key: 'time', label: 'Tiempo trabajado', value: (v) => formatMinutes(vehicleTimes[v.id] || 0) },
      { key: 'created', label: 'Creado', value: (v) => format(new Date(v.created_at), 'dd/MM/yyyy HH:mm') },
    ]);
  };


  const isAdmin = role === 'admin';

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
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Vista general del taller</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <Button 
                variant={viewMode === 'charts' ? "default" : "outline"} 
                size="sm"
                onClick={() => setViewMode(viewMode === 'charts' ? 'kanban' : 'charts')}
                className="gap-2"
              >
                <BarChart2 className="h-4 w-4" />
                <span className="hidden sm:inline">Gráficos</span>
              </Button>
            )}
            <Button 
              variant={viewMode === 'list' ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
              className="gap-2"
            >
              {viewMode === 'list' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              <span className="hidden sm:inline">{viewMode === 'list' ? 'Kanban' : 'Lista'}</span>
            </Button>
            <Button
              variant={priorityFilter === 'urgent_high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPriorityFilter(priorityFilter === 'urgent_high' ? 'all' : 'urgent_high')}
              className={cn('gap-2', priorityFilter === 'urgent_high' && 'bg-red-600 hover:bg-red-700 text-white')}
              title="Solo urgentes y altas"
            >
              <Flame className="h-4 w-4" />
              <span className="hidden sm:inline">Urgentes</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2" title="Exportar CSV">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <QuickPlateDialog onSuccess={fetchVehicles} triggerLabel="Matrícula rápida" />
            <NewVehicleDialog onSuccess={fetchVehicles} />
          </div>
        </div>

        {/* Stats - clickable filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4">
          {stats.map((stat) => {
            const isActive = statusFilter === stat.filter;
            return (
              <button
                key={stat.label}
                onClick={() => setStatusFilter(isActive ? 'all' : stat.filter)}
                className={cn(
                  "bg-card rounded-xl border p-3 md:p-4 flex items-center gap-3 transition-all text-left",
                  isActive
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border hover:border-primary/50 hover:shadow-sm"
                )}
              >
                <div className={cn("p-2 md:p-3 rounded-lg", isActive ? "bg-primary/10" : "bg-muted", stat.color)}>
                  <stat.icon className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active filter indicator */}
        {statusFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Filtrando por: <strong>{stats.find(s => s.filter === statusFilter)?.label}</strong>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')} className="text-xs h-7">
              Mostrar todos
            </Button>
          </div>
        )}

        {/* Charts View */}
        {viewMode === 'charts' && isAdmin && (
          <DashboardCharts vehicles={vehicles} />
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asignado a</TableHead>
                  <TableHead className="hidden md:table-cell">Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.map((vehicle) => (
                  <TableRow 
                    key={vehicle.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                  >
                    <TableCell className="font-semibold">{vehicle.plate}</TableCell>
                    <TableCell className="text-muted-foreground">{vehicle.brand} {vehicle.model}</TableCell>
                    <TableCell><VehicleStatusBadge status={vehicle.status} /></TableCell>
                    <TableCell>{vehicle.assigned_to ? profiles[vehicle.assigned_to] || '—' : <span className="text-muted-foreground italic">Sin asignar</span>}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs max-w-[200px] truncate">
                      {vehicle.client_description || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Kanban Board - horizontal scroll on mobile, grid on larger screens */}
        {viewMode === 'kanban' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            {/* Mobile */}
            <div className="lg:hidden overflow-x-auto pb-4 -mx-4 px-4">
              <div className="flex gap-4 min-w-max">
                {filteredStatusOrder.map((status) => {
                  const statusVehicles = getVehiclesByStatusFiltered(status);
                  return (
                    <Droppable key={status} droppableId={status}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                          <StatusColumn status={status} count={statusVehicles.length}>
                            <div className={cn("min-h-[60px] transition-colors rounded-lg", snapshot.isDraggingOver && "bg-primary/10")}>
                              {statusVehicles.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-8">Sin vehículos</p>
                              ) : (
                                statusVehicles.map((vehicle, index) => (
                                  <Draggable key={vehicle.id} draggableId={vehicle.id} index={index}>
                                    {(provided) => (
                                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="mb-2">
                                        <VehicleCard vehicle={vehicle} totalTime={vehicleTimes[vehicle.id] || 0} showNextAction onStatusChange={fetchVehicles} />
                                      </div>
                                    )}
                                  </Draggable>
                                ))
                              )}
                              {provided.placeholder}
                            </div>
                          </StatusColumn>
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </div>

            {/* Desktop */}
            <div className={cn(
              "hidden lg:grid gap-3",
              filteredStatusOrder.length === 1 && "lg:grid-cols-1",
              filteredStatusOrder.length === 2 && "lg:grid-cols-2",
              filteredStatusOrder.length === 3 && "lg:grid-cols-3",
              filteredStatusOrder.length === 4 && "lg:grid-cols-4",
              filteredStatusOrder.length === 5 && "lg:grid-cols-5",
              filteredStatusOrder.length === 6 && "lg:grid-cols-6",
              filteredStatusOrder.length === 7 && "lg:grid-cols-7",
              filteredStatusOrder.length === 8 && "lg:grid-cols-8",
            )}>
              {filteredStatusOrder.map((status) => {
                const statusVehicles = getVehiclesByStatusFiltered(status);
                return (
                  <Droppable key={status} droppableId={status}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        <StatusColumn status={status} count={statusVehicles.length}>
                          <div className={cn("min-h-[60px] transition-colors rounded-lg", snapshot.isDraggingOver && "bg-primary/10")}>
                            {statusVehicles.length === 0 ? (
                              <p className="text-center text-sm text-muted-foreground py-8">Sin vehículos</p>
                            ) : (
                              statusVehicles.map((vehicle, index) => (
                                <Draggable key={vehicle.id} draggableId={vehicle.id} index={index}>
                                  {(provided) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="mb-2">
                                      <VehicleCard vehicle={vehicle} totalTime={vehicleTimes[vehicle.id] || 0} showNextAction onStatusChange={fetchVehicles} />
                                    </div>
                                  )}
                                </Draggable>
                              ))
                            )}
                            {provided.placeholder}
                          </div>
                        </StatusColumn>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>
    </MainLayout>
  );
}
