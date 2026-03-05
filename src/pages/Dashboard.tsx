import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VehicleWithOwner, VehicleStatus, Profile } from '@/lib/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusColumn } from '@/components/dashboard/StatusColumn';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { NewVehicleDialog } from '@/components/vehicles/NewVehicleDialog';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { Loader2, Car, Clock, Wrench, CheckCircle, PackageCheck, BarChart2, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VehicleStatusBadge } from '@/components/vehicles/VehicleStatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS } from '@/lib/types';

const statusOrder: VehicleStatus[] = ['recibido', 'en_reparacion', 'pendiente_piezas', 'terminado', 'facturado', 'entregado'];
type ViewMode = 'kanban' | 'charts' | 'list';

export default function Dashboard() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleWithOwner[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [vehicleTimes, setVehicleTimes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

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
    fetchVehicles();
  }, []);

  const getVehiclesByStatus = (status: VehicleStatus) => {
    return vehicles.filter((v) => v.status === status);
  };

  const stats = [
    {
      label: 'En Taller',
      value: vehicles.filter((v) => v.status !== 'terminado' && v.status !== 'entregado').length,
      icon: Car,
      color: 'text-primary',
    },
    {
      label: 'En Reparación',
      value: vehicles.filter((v) => v.status === 'en_reparacion').length,
      icon: Wrench,
      color: 'text-status-in-progress',
    },
    {
      label: 'Pendiente Piezas',
      value: vehicles.filter((v) => v.status === 'pendiente_piezas').length,
      icon: Clock,
      color: 'text-status-pending-parts',
    },
    {
      label: 'Terminados',
      value: vehicles.filter((v) => v.status === 'terminado').length,
      icon: CheckCircle,
      color: 'text-status-completed',
    },
    {
      label: 'Facturados',
      value: vehicles.filter((v) => v.status === 'facturado').length,
      icon: CheckCircle,
      color: 'text-status-invoiced',
    },
    {
      label: 'Entregados',
      value: vehicles.filter((v) => v.status === 'entregado').length,
      icon: PackageCheck,
      color: 'text-status-delivered',
    },
  ];

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
          <div className="flex gap-2">
            {isAdmin && (
              <Button 
                variant={viewMode === 'charts' ? "default" : "outline"} 
                size="sm"
                onClick={() => setViewMode(viewMode === 'charts' ? 'kanban' : 'charts')}
                className="gap-2"
              >
                <BarChart2 className="h-4 w-4" />
                Gráficos
              </Button>
            )}
            <Button 
              variant={viewMode === 'list' ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
              className="gap-2"
            >
              {viewMode === 'list' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              {viewMode === 'list' ? 'Kanban' : 'Lista'}
            </Button>
            <NewVehicleDialog onSuccess={fetchVehicles} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl border border-border p-3 md:p-4 flex items-center gap-3"
            >
              <div className={`p-2 md:p-3 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

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
                {vehicles.map((vehicle) => (
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
          <>
            <div className="lg:hidden overflow-x-auto pb-4 -mx-4 px-4">
              <div className="flex gap-4 min-w-max">
                {statusOrder.map((status) => {
                  const statusVehicles = getVehiclesByStatus(status);
                  return (
                    <StatusColumn key={status} status={status} count={statusVehicles.length}>
                      {statusVehicles.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">
                          Sin vehículos
                        </p>
                      ) : (
                        statusVehicles.map((vehicle) => (
                          <VehicleCard key={vehicle.id} vehicle={vehicle} showNextAction onStatusChange={fetchVehicles} />
                        ))
                      )}
                    </StatusColumn>
                  );
                })}
              </div>
            </div>

            {/* Kanban Board - grid layout on desktop */}
            <div className="hidden lg:grid lg:grid-cols-6 gap-4">
              {statusOrder.map((status) => {
                const statusVehicles = getVehiclesByStatus(status);
                return (
                  <StatusColumn key={status} status={status} count={statusVehicles.length}>
                    {statusVehicles.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        Sin vehículos
                      </p>
                    ) : (
                      statusVehicles.map((vehicle) => (
                        <VehicleCard key={vehicle.id} vehicle={vehicle} showNextAction onStatusChange={fetchVehicles} />
                      ))
                    )}
                  </StatusColumn>
                );
              })}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
