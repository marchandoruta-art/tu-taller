import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VehicleWithOwner, STATUS_LABELS } from '@/lib/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { NewVehicleDialog } from '@/components/vehicles/NewVehicleDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, UserCheck, RefreshCw, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { QuickPlateDialog } from '@/components/vehicles/QuickPlateDialog';

export default function Vehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  const shouldIncludeArchived = includeArchived || search.trim().length > 0;

  const fetchVehicles = async () => {
    let query = supabase
      .from('vehicles')
      .select('*, owner:owners(*)')
      .order('created_at', { ascending: false });

    if (!shouldIncludeArchived) {
      query = query.eq('archived', false);
    }

    const { data } = await query;

    if (data) {
      setVehicles(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();

    // Refetch when tab regains focus (user comes back from another page/tab)
    const handleFocus = () => fetchVehicles();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Realtime subscription: refetch on any vehicle change in the org
    const channel = supabase
      .channel('vehicles-list-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        () => fetchVehicles()
      )
      .subscribe();

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  const myVehiclesCount = vehicles.filter((v) => v.assigned_to === user?.id).length;

  const filteredVehicles = vehicles.filter((v) => {
    const ownerName = v.owner?.name?.toLowerCase() || '';
    const matchesSearch =
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      ownerName.includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchesMine = !showOnlyMine || v.assigned_to === user?.id;

    return matchesSearch && matchesStatus && matchesMine;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Vehículos</h1>
            <p className="text-muted-foreground">
              {vehicles.length} vehículos registrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchVehicles} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refrescar
            </Button>
            <QuickPlateDialog onSuccess={fetchVehicles} triggerLabel="Matrícula rápida" triggerVariant="outline" />
            <NewVehicleDialog onSuccess={fetchVehicles} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por matrícula, marca, modelo o propietario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showOnlyMine ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyMine(!showOnlyMine)}
            className="gap-2 h-10"
          >
            <UserCheck className="h-4 w-4" />
            Mis vehículos {myVehiclesCount > 0 && `(${myVehiclesCount})`}
          </Button>
        </div>

        {/* Grid */}
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No se encontraron vehículos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} onStatusChange={fetchVehicles} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
