import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VehicleWithOwner, STATUS_LABELS } from '@/lib/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { NewVehicleDialog } from '@/components/vehicles/NewVehicleDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, UserCheck, RefreshCw, Archive, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { QuickPlateDialog } from '@/components/vehicles/QuickPlateDialog';

export default function Vehicles() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleWithOwner[]>([]);
  const [deletedMatches, setDeletedMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [operators, setOperators] = useState<{ user_id: string; full_name: string; count: number }[]>([]);
  const isAdmin = role === 'admin';


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
  }, [shouldIncludeArchived]);

  // Search in deleted archives too when user types
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setDeletedMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      const term = `%${q}%`;
      const { data } = await supabase
        .from('vehicle_archives')
        .select('id, vehicle_id, plate, brand, model, archived_at, owner_snapshot')
        .or(`plate.ilike.${term},brand.ilike.${term},model.ilike.${term}`)
        .order('archived_at', { ascending: false })
        .limit(20);
      setDeletedMatches(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load operators list for admin filter
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['mecanico', 'chapista', 'admin']);
      const ids = (roles || []).map((r: any) => r.user_id);
      if (!ids.length) return;
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ids);
      const list = (profs || []).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name || 'Sin nombre',
        count: vehicles.filter((v) => v.assigned_to === p.user_id).length,
      }));
      list.sort((a, b) => b.count - a.count);
      setOperators(list);
    })();
  }, [isAdmin, vehicles]);

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
    const matchesAssigned =
      assignedFilter === 'all' ||
      (assignedFilter === 'unassigned' ? !v.assigned_to : v.assigned_to === assignedFilter);

    return matchesSearch && matchesStatus && matchesMine && matchesAssigned;
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
          <Button
            variant={includeArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setIncludeArchived(!includeArchived)}
            className="gap-2 h-10"
            title="Incluye vehículos entregados hace más de 24h"
          >
            <Archive className="h-4 w-4" />
            Archivados
          </Button>
        </div>

        {/* Grid */}
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No se encontraron vehículos activos ni archivados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} onStatusChange={fetchVehicles} />
            ))}
          </div>
        )}

        {/* Deleted vehicles (from archive snapshots) */}
        {search.trim().length >= 2 && deletedMatches.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <History className="h-4 w-4" />
              <span>Encontrados en histórico eliminado ({deletedMatches.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {deletedMatches.map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/plate-history?plate=${encodeURIComponent(a.plate)}`)}
                  className="text-left rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/50 transition-colors p-4 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-destructive shrink-0" />
                    <span className="font-mono font-bold">{a.plate}</span>
                    <span className="text-xs uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                      Eliminado
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {a.brand} {a.model}
                    {a.owner_snapshot?.name && ` · ${a.owner_snapshot.name}`}
                  </p>
                  <p className="text-xs text-muted-foreground">Ver histórico completo →</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
