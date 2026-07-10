import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Users, Car, Clock, Wrench, Download, ChevronRight } from 'lucide-react';
import { Profile, ROLE_LABELS, UserRole, STATUS_LABELS, VehicleStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadCsv, formatMinutes } from '@/lib/exportCsv';
import { toast } from 'sonner';

interface VehicleLite {
  id: string;
  plate: string;
  brand: string;
  model: string;
  status: VehicleStatus;
  assigned_to: string | null;
  priority: string | null;
  created_at: string;
}

interface OperatorWorkload {
  profile: Profile;
  role: UserRole;
  vehicleCount: number;
  totalMinutes: number;
  vehicles: VehicleLite[];
}

export default function WorkloadPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<OperatorWorkload[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  useEffect(() => {
    fetchWorkload();
  }, []);

  const fetchWorkload = async () => {
    setLoading(true);

    const [profilesRes, rolesRes, vehiclesRes, timeLogsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase
        .from('vehicles')
        .select('id, plate, brand, model, status, assigned_to, priority, created_at')
        .eq('archived', false)
        .neq('status', 'entregado'),
      supabase.from('time_logs').select('user_id, total_minutes'),
    ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const vehicles = (vehiclesRes.data || []) as VehicleLite[];
    const timeLogs = timeLogsRes.data || [];

    const workloadMap = new Map<string, OperatorWorkload>();

    for (const profile of profiles) {
      const roleEntry = roles.find((r) => r.user_id === profile.user_id);
      if (!roleEntry) continue;
      const role = roleEntry.role as UserRole;
      if (!['mecanico', 'chapista', 'admin'].includes(role)) continue;

      const assignedVehicles = vehicles.filter((v) => v.assigned_to === profile.user_id);
      const userTimeLogs = timeLogs.filter((t) => t.user_id === profile.user_id);
      const totalMinutes = userTimeLogs.reduce((sum, t) => sum + (t.total_minutes || 0), 0);

      workloadMap.set(profile.user_id, {
        profile,
        role,
        vehicleCount: assignedVehicles.length,
        totalMinutes,
        vehicles: assignedVehicles,
      });
    }

    setOperators(
      Array.from(workloadMap.values()).sort((a, b) => b.vehicleCount - a.vehicleCount)
    );
    setLoading(false);
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const maxVehicles = Math.max(...operators.map((o) => o.vehicleCount), 1);

  const filteredOperators = useMemo(
    () => (selectedUserId === 'all' ? operators : operators.filter((o) => o.profile.user_id === selectedUserId)),
    [operators, selectedUserId]
  );

  const statusColor: Record<string, string> = {
    recibido: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    en_reparacion: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    pendiente_piezas: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
    terminado: 'bg-green-500/15 text-green-500 border-green-500/30',
    facturado: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
    entregado: 'bg-muted text-muted-foreground border-border',
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Carga de Trabajo
            </h1>
            <p className="text-muted-foreground text-sm">Distribución de vehículos y horas por operario</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filtrar por operario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los operarios</SelectItem>
                {operators.map((o) => (
                  <SelectItem key={o.profile.user_id} value={o.profile.user_id}>
                    {o.profile.full_name} ({o.vehicleCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                if (operators.length === 0) return toast.info('Nada que exportar');
                downloadCsv('carga-trabajo', operators, [
                  { key: 'name', label: 'Operario', value: (o) => o.profile.full_name },
                  { key: 'role', label: 'Rol', value: (o) => ROLE_LABELS[o.role] },
                  { key: 'vehicles', label: 'Vehículos asignados', value: (o) => o.vehicleCount },
                  { key: 'time', label: 'Horas totales', value: (o) => formatMinutes(o.totalMinutes) },
                  { key: 'plates', label: 'Matrículas', value: (o) => o.vehicles.map((v) => v.plate).join(', ') },
                ]);
              }}
            >
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{operators.length}</p>
                  <p className="text-xs text-muted-foreground">Operarios</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Car className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{operators.reduce((s, o) => s + o.vehicleCount, 0)}</p>
                  <p className="text-xs text-muted-foreground">Vehículos asignados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{formatTime(operators.reduce((s, o) => s + o.totalMinutes, 0))}</p>
                  <p className="text-xs text-muted-foreground">Horas totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Wrench className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">
                    {operators.length > 0
                      ? (operators.reduce((s, o) => s + o.vehicleCount, 0) / operators.length).toFixed(1)
                      : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Media/operario</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operator Cards */}
        <div className={selectedUserId === 'all' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'grid grid-cols-1 gap-4'}>
          {filteredOperators.map((op) => (
            <Card key={op.profile.user_id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={op.profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(op.profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{op.profile.full_name}</p>
                    <Badge variant="outline" className="text-xs">{ROLE_LABELS[op.role]}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{op.vehicleCount}</p>
                    <p className="text-xs text-muted-foreground">vehículos</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Carga</span>
                    <span>{Math.round((op.vehicleCount / maxVehicles) * 100)}%</span>
                  </div>
                  <Progress value={(op.vehicleCount / maxVehicles) * 100} className="h-2" />
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono">{formatTime(op.totalMinutes)}</span>
                  </div>
                </div>

                {/* Detailed vehicle list — clickable */}
                {op.vehicles.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Vehículos asignados
                    </p>
                    <div className="space-y-1.5">
                      {op.vehicles.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => navigate(`/vehicles/${v.id}`)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-colors text-left"
                        >
                          <Badge variant="secondary" className="font-mono text-xs shrink-0">
                            {v.plate}
                          </Badge>
                          <span className="text-sm truncate flex-1">
                            {v.brand} {v.model}
                          </span>
                          <span
                            className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${statusColor[v.status] || ''}`}
                          >
                            {STATUS_LABELS[v.status] || v.status}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
                    Sin vehículos asignados
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOperators.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No hay operarios con vehículos asignados</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
