import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, User, Car, Clock, Wrench, Euro, Phone, Mail, 
  FileText, Calendar, Loader2, ChevronRight 
} from 'lucide-react';
import { VehicleStatusBadge } from '@/components/vehicles/VehicleStatusBadge';
import { Owner, VehicleStatus, STATUS_LABELS } from '@/lib/types';

interface VehicleHistory {
  id: string;
  plate: string;
  brand: string;
  model: string;
  color?: string;
  status: VehicleStatus;
  created_at: string;
  delivered_at?: string;
  archived?: boolean;
  work_summary?: string;
  
  totalMinutes: number;
  partsCount: number;
  partsCost: number;
}

export default function ClientHistory() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [vehicles, setVehicles] = useState<VehicleHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const canView = role === 'admin' || role === 'oficina';

  useEffect(() => {
    if (!canView) {
      navigate('/');
      return;
    }
    if (ownerId) fetchHistory();
  }, [ownerId, canView]);

  const fetchHistory = async () => {
    try {
      // Fetch owner
      const { data: ownerData } = await supabase
        .from('owners')
        .select('*')
        .eq('id', ownerId!)
        .single();

      if (!ownerData) {
        navigate('/');
        return;
      }
      setOwner(ownerData as Owner);

      // Fetch all vehicles for this owner (including archived)
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, plate, brand, model, color, status, created_at, delivered_at, archived, work_summary, estimated_cost')
        .eq('owner_id', ownerId!)
        .order('created_at', { ascending: false });

      if (!vehiclesData || vehiclesData.length === 0) {
        setVehicles([]);
        setLoading(false);
        return;
      }

      const vehicleIds = vehiclesData.map(v => v.id);

      // Fetch time logs and parts in parallel
      const [timeLogsRes, partsRes] = await Promise.all([
        supabase
          .from('time_logs')
          .select('vehicle_id, total_minutes')
          .in('vehicle_id', vehicleIds),
        supabase
          .from('parts')
          .select('vehicle_id, unit_price, quantity')
          .in('vehicle_id', vehicleIds),
      ]);

      const timeByVehicle: Record<string, number> = {};
      (timeLogsRes.data || []).forEach(tl => {
        timeByVehicle[tl.vehicle_id] = (timeByVehicle[tl.vehicle_id] || 0) + (tl.total_minutes || 0);
      });

      const partsByVehicle: Record<string, { count: number; cost: number }> = {};
      (partsRes.data || []).forEach(p => {
        if (!partsByVehicle[p.vehicle_id]) partsByVehicle[p.vehicle_id] = { count: 0, cost: 0 };
        partsByVehicle[p.vehicle_id].count += 1;
        partsByVehicle[p.vehicle_id].cost += (p.unit_price || 0) * (p.quantity || 1);
      });

      setVehicles(vehiclesData.map(v => ({
        ...v,
        status: v.status as VehicleStatus,
        totalMinutes: timeByVehicle[v.id] || 0,
        partsCount: partsByVehicle[v.id]?.count || 0,
        partsCost: partsByVehicle[v.id]?.cost || 0,
      })));
    } catch (error) {
      console.error('Error fetching client history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const totalSpent = vehicles.reduce((sum, v) => sum + v.partsCost, 0);
  const totalTime = vehicles.reduce((sum, v) => sum + v.totalMinutes, 0);
  const totalVehicles = vehicles.length;
  const completedVehicles = vehicles.filter(v => v.status === 'entregado' || v.archived).length;

  if (!canView) return null;

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
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-3 rounded-xl bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{owner?.name}</h1>
            <p className="text-sm text-muted-foreground">Historial completo del cliente</p>
          </div>
        </div>

        {/* Owner Contact Info */}
        {owner && (
          <Card>
            <CardContent className="pt-4 flex flex-wrap gap-6">
              {owner.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${owner.phone}`} className="hover:text-primary">{owner.phone}</a>
                </div>
              )}
              {owner.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${owner.email}`} className="hover:text-primary">{owner.email}</a>
                </div>
              )}
              {owner.dni && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>DNI: {owner.dni}</span>
                </div>
              )}
              {owner.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {owner.address}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-primary">{totalVehicles}</div>
              <div className="text-xs text-muted-foreground">Vehículos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-primary">{completedVehicles}</div>
              <div className="text-xs text-muted-foreground">Completados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-primary">{formatTime(totalTime)}</div>
              <div className="text-xs text-muted-foreground">Tiempo Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {totalSpent > 0 ? `${totalSpent.toFixed(0)}€` : '-'}
              </div>
              <div className="text-xs text-muted-foreground">Gasto Estimado</div>
            </CardContent>
          </Card>
        </div>

        {/* Vehicles List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehículos ({vehicles.length})
          </h2>

          {vehicles.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay vehículos registrados para este cliente
              </CardContent>
            </Card>
          ) : (
            vehicles.map((v) => (
              <Card 
                key={v.id} 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/vehicles/${v.id}`)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{v.plate}</span>
                        <VehicleStatusBadge status={v.status} />
                        {v.archived && (
                          <Badge variant="outline" className="text-xs">Archivado</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {v.brand} {v.model} {v.color && `• ${v.color}`}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(v.created_at).toLocaleDateString('es-ES')}
                        </span>
                        {v.totalMinutes > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(v.totalMinutes)}
                          </span>
                        )}
                        {v.partsCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {v.partsCount} piezas
                          </span>
                        )}
                        {v.partsCost > 0 && (
                          <span className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            {v.partsCost.toFixed(0)}€
                          </span>
                        )}
                      </div>
                      {v.work_summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {v.work_summary}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
