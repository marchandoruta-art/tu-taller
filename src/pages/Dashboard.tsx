import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VehicleWithOwner, VehicleStatus } from '@/lib/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusColumn } from '@/components/dashboard/StatusColumn';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { NewVehicleDialog } from '@/components/vehicles/NewVehicleDialog';
import { Loader2, Car, Clock, Wrench, CheckCircle, PackageCheck } from 'lucide-react';

const statusOrder: VehicleStatus[] = ['recibido', 'en_reparacion', 'pendiente_piezas', 'terminado', 'entregado'];

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<VehicleWithOwner[]>([]);
  const [loading, setLoading] = useState(true);

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
      label: 'Entregados',
      value: vehicles.filter((v) => v.status === 'entregado').length,
      icon: PackageCheck,
      color: 'text-status-delivered',
    },
  ];

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
          <NewVehicleDialog onSuccess={fetchVehicles} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
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

        {/* Kanban Board - horizontal scroll on mobile, grid on larger screens */}
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
        <div className="hidden lg:grid lg:grid-cols-5 gap-4">
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
    </MainLayout>
  );
}
