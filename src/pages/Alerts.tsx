import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { VehicleWithOwner, STATUS_LABELS } from '@/lib/types';
import { 
  AlertTriangle, 
  Clock, 
  Car, 
  TrendingDown, 
  Loader2,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { differenceInDays, differenceInHours } from 'date-fns';

interface StalledVehicle extends VehicleWithOwner {
  daysStalled: number;
}

interface LowProductivityUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  attendanceMinutes: number;
  workMinutes: number;
  productivity: number;
}

export default function Alerts() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stalledVehicles, setStalledVehicles] = useState<StalledVehicle[]>([]);
  const [lowProductivityUsers, setLowProductivityUsers] = useState<LowProductivityUser[]>([]);
  const [pendingPartsVehicles, setPendingPartsVehicles] = useState<StalledVehicle[]>([]);

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/');
      return;
    }
    fetchAlerts();
  }, [role, navigate]);

  const fetchAlerts = async () => {
    setLoading(true);

    // Fetch vehicles
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*, owner:owners(*)')
      .eq('archived', false)
      .neq('status', 'entregado');

    if (vehicles) {
      // Find stalled vehicles (same status for more than 3 days)
      const stalled: StalledVehicle[] = [];
      const pendingParts: StalledVehicle[] = [];

      vehicles.forEach((v: VehicleWithOwner) => {
        const daysSinceUpdate = differenceInDays(new Date(), new Date(v.updated_at));
        
        if (daysSinceUpdate >= 3 && v.status !== 'terminado') {
          stalled.push({ ...v, daysStalled: daysSinceUpdate });
        }
        
        if (v.status === 'pendiente_piezas') {
          const daysPending = differenceInDays(new Date(), new Date(v.updated_at));
          pendingParts.push({ ...v, daysStalled: daysPending });
        }
      });

      setStalledVehicles(stalled.sort((a, b) => b.daysStalled - a.daysStalled));
      setPendingPartsVehicles(pendingParts.sort((a, b) => b.daysStalled - a.daysStalled));
    }

    // Fetch productivity data for the last week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: attendance } = await supabase
      .from('attendance_logs')
      .select('*')
      .gte('clock_in', weekAgo.toISOString());

    const { data: timeLogs } = await supabase
      .from('time_logs')
      .select('*')
      .gte('started_at', weekAgo.toISOString())
      .not('ended_at', 'is', null);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url');

    if (attendance && timeLogs && profiles) {
      const userProductivity: Record<string, { attendance: number; work: number }> = {};

      attendance.forEach(log => {
        if (!userProductivity[log.user_id]) {
          userProductivity[log.user_id] = { attendance: 0, work: 0 };
        }
        userProductivity[log.user_id].attendance += log.total_minutes || 0;
      });

      timeLogs.forEach(log => {
        if (!userProductivity[log.user_id]) {
          userProductivity[log.user_id] = { attendance: 0, work: 0 };
        }
        userProductivity[log.user_id].work += log.total_minutes || 0;
      });

      const lowProductivity: LowProductivityUser[] = [];

      Object.entries(userProductivity).forEach(([userId, data]) => {
        if (data.attendance > 0) {
          const productivity = (data.work / data.attendance) * 100;
          if (productivity < 50) {
            const profile = profiles.find(p => p.user_id === userId);
            if (profile) {
              lowProductivity.push({
                user_id: userId,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url || undefined,
                attendanceMinutes: data.attendance,
                workMinutes: data.work,
                productivity,
              });
            }
          }
        }
      });

      setLowProductivityUsers(lowProductivity.sort((a, b) => a.productivity - b.productivity));
    }

    setLoading(false);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const totalAlerts = stalledVehicles.length + lowProductivityUsers.length + pendingPartsVehicles.length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-status-pending-parts" />
              Sistema de Alertas
            </h1>
            <p className="text-muted-foreground">Monitoreo de vehículos estancados y productividad</p>
          </div>
          {totalAlerts > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {totalAlerts} alertas
            </Badge>
          )}
        </div>

        {totalAlerts === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto bg-status-completed/20 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-status-completed" />
              </div>
              <h3 className="text-lg font-semibold mb-2">¡Todo en orden!</h3>
              <p className="text-muted-foreground">No hay alertas activas en este momento.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="stalled" className="space-y-4">
            <TabsList>
              <TabsTrigger value="stalled" className="gap-2">
                <Clock className="h-4 w-4" />
                Estancados ({stalledVehicles.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Car className="h-4 w-4" />
                Pend. Piezas ({pendingPartsVehicles.length})
              </TabsTrigger>
              <TabsTrigger value="productivity" className="gap-2">
                <TrendingDown className="h-4 w-4" />
                Baja Productividad ({lowProductivityUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stalled" className="space-y-4">
              {stalledVehicles.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No hay vehículos estancados
                  </CardContent>
                </Card>
              ) : (
                stalledVehicles.map(vehicle => (
                  <Card key={vehicle.id} className="border-l-4 border-l-status-pending-parts">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-status-pending-parts/20 rounded-lg flex items-center justify-center">
                            <Car className="h-6 w-6 text-status-pending-parts" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{vehicle.plate}</h3>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.brand} {vehicle.model}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {STATUS_LABELS[vehicle.status]}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-status-pending-parts">
                            <Calendar className="h-4 w-4" />
                            <span className="font-semibold">{vehicle.daysStalled} días</span>
                          </div>
                          <p className="text-xs text-muted-foreground">sin actualización</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {pendingPartsVehicles.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No hay vehículos pendientes de piezas
                  </CardContent>
                </Card>
              ) : (
                pendingPartsVehicles.map(vehicle => (
                  <Card key={vehicle.id} className="border-l-4 border-l-status-in-progress">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-status-in-progress/20 rounded-lg flex items-center justify-center">
                            <Car className="h-6 w-6 text-status-in-progress" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{vehicle.plate}</h3>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.brand} {vehicle.model}
                            </p>
                            {vehicle.owner && (
                              <p className="text-xs text-muted-foreground">{vehicle.owner.name}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-status-in-progress">
                            <Clock className="h-4 w-4" />
                            <span className="font-semibold">{vehicle.daysStalled} días</span>
                          </div>
                          <p className="text-xs text-muted-foreground">esperando piezas</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="productivity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-status-pending-parts" />
                    Usuarios con productividad inferior al 50% (última semana)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lowProductivityUsers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Todos los usuarios tienen buena productividad
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {lowProductivityUsers.map(user => (
                        <div key={user.user_id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium">
                              {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Asistencia: {formatTime(user.attendanceMinutes)} | Trabajo: {formatTime(user.workMinutes)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-2xl font-bold ${user.productivity < 30 ? 'text-status-pending-parts' : 'text-status-in-progress'}`}>
                              {user.productivity.toFixed(0)}%
                            </span>
                            <p className="text-xs text-muted-foreground">productividad</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}