import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Users, Car, Clock, Wrench, Download } from 'lucide-react';
import { Profile, ROLE_LABELS, UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { downloadCsv, formatMinutes } from '@/lib/exportCsv';
import { toast } from 'sonner';

interface OperatorWorkload {
  profile: Profile;
  role: UserRole;
  vehicleCount: number;
  totalMinutes: number;
  vehiclePlates: string[];
}

export default function WorkloadPage() {
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<OperatorWorkload[]>([]);

  useEffect(() => {
    fetchWorkload();
  }, []);

  const fetchWorkload = async () => {
    setLoading(true);

    // Fetch profiles, roles, vehicles, and time logs in parallel
    const [profilesRes, rolesRes, vehiclesRes, timeLogsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('vehicles').select('id, plate, assigned_to').eq('archived', false).neq('status', 'entregado'),
      supabase.from('time_logs').select('user_id, total_minutes'),
    ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const vehicles = vehiclesRes.data || [];
    const timeLogs = timeLogsRes.data || [];

    // Build workload per operator
    const workloadMap = new Map<string, OperatorWorkload>();

    for (const profile of profiles) {
      const roleEntry = roles.find((r) => r.user_id === profile.user_id);
      if (!roleEntry) continue;
      const role = roleEntry.role as UserRole;
      // Only show technicians and admin
      if (!['mecanico', 'chapista', 'admin'].includes(role)) continue;

      const assignedVehicles = vehicles.filter((v) => v.assigned_to === profile.user_id);
      const userTimeLogs = timeLogs.filter((t) => t.user_id === profile.user_id);
      const totalMinutes = userTimeLogs.reduce((sum, t) => sum + (t.total_minutes || 0), 0);

      workloadMap.set(profile.user_id, {
        profile,
        role,
        vehicleCount: assignedVehicles.length,
        totalMinutes,
        vehiclePlates: assignedVehicles.map((v) => v.plate),
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
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Carga de Trabajo
          </h1>
          <p className="text-muted-foreground text-sm">Distribución de vehículos y horas por operario</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
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
                <div className="p-2 rounded-lg bg-primary/10">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {operators.reduce((s, o) => s + o.vehicleCount, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Vehículos asignados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatTime(operators.reduce((s, o) => s + o.totalMinutes, 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">Horas totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {operators.map((op) => (
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
                    <Badge variant="outline" className="text-xs">
                      {ROLE_LABELS[op.role]}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{op.vehicleCount}</p>
                    <p className="text-xs text-muted-foreground">vehículos</p>
                  </div>
                </div>

                {/* Workload bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Carga</span>
                    <span>{Math.round((op.vehicleCount / maxVehicles) * 100)}%</span>
                  </div>
                  <Progress value={(op.vehicleCount / maxVehicles) * 100} className="h-2" />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono">{formatTime(op.totalMinutes)}</span>
                  </div>
                </div>

                {/* Assigned vehicle plates */}
                {op.vehiclePlates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {op.vehiclePlates.map((plate) => (
                      <Badge key={plate} variant="secondary" className="font-mono text-xs">
                        {plate}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {operators.length === 0 && (
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
