import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Clock, 
  Wrench, 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  Users,
  Download,
} from 'lucide-react';
import { downloadCsv, formatMinutes } from '@/lib/exportCsv';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Navigate } from 'react-router-dom';
import { ROLE_LABELS, UserRole } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserProductivity {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  role?: UserRole;
  attendanceMinutes: number;
  workMinutes: number;
  productivity: number;
  attendanceSessions: number;
  workSessions: number;
}

export default function Productivity() {
  const { role, loading: authLoading } = useAuth();
  const { organizationId, loading: orgLoading } = useOrganization();
  const [productivityData, setProductivityData] = useState<UserProductivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState(new Date());
  const [periodType, setPeriodType] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (role === 'admin' && organizationId) {
      fetchProductivityData();
    }
  }, [role, organizationId, currentPeriod, periodType]);

  const fetchProductivityData = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    
    let startDate: Date;
    let endDate: Date;
    
    if (periodType === 'week') {
      startDate = startOfWeek(currentPeriod, { weekStartsOn: 1 });
      endDate = endOfWeek(currentPeriod, { weekStartsOn: 1 });
    } else {
      startDate = startOfMonth(currentPeriod);
      endDate = endOfMonth(currentPeriod);
    }

    // Fetch ALL users from the organization (operarios: mecanico, chapista)
    const { data: allUsersRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('organization_id', organizationId)
      .in('role', ['mecanico', 'chapista']);

    const allUserIds = allUsersRoles?.map(u => u.user_id) || [];

    if (allUserIds.length === 0) {
      setProductivityData([]);
      setLoading(false);
      return;
    }

    // Fetch profiles for all users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', allUserIds);

    // Fetch attendance logs for these users in the period
    const { data: attendanceLogs } = await supabase
      .from('attendance_logs')
      .select('*')
      .in('user_id', allUserIds)
      .gte('clock_in', startDate.toISOString())
      .lte('clock_in', endDate.toISOString());

    // Fetch work time logs for these users in the period
    const { data: timeLogs } = await supabase
      .from('time_logs')
      .select('*')
      .in('user_id', allUserIds)
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())
      .not('ended_at', 'is', null);

    // Calculate productivity per user (all operarios, even without logs)
    const userMap = new Map<string, UserProductivity>();

    allUserIds.forEach(userId => {
      const profile = profiles?.find(p => p.user_id === userId);
      const userRole = allUsersRoles?.find(r => r.user_id === userId)?.role as UserRole;
      
      // Sum attendance minutes
      const userAttendance = attendanceLogs?.filter(l => l.user_id === userId) || [];
      const attendanceMinutes = userAttendance.reduce((sum, log) => sum + (log.total_minutes || 0), 0);
      
      // Sum work minutes
      const userTimeLogs = timeLogs?.filter(l => l.user_id === userId) || [];
      const workMinutes = userTimeLogs.reduce((sum, log) => sum + (log.total_minutes || 0), 0);
      
      // Calculate productivity percentage
      const productivity = attendanceMinutes > 0 
        ? Math.min(100, Math.round((workMinutes / attendanceMinutes) * 100))
        : 0;

      userMap.set(userId, {
        user_id: userId,
        full_name: profile?.full_name || 'Usuario',
        avatar_url: profile?.avatar_url || undefined,
        role: userRole,
        attendanceMinutes,
        workMinutes,
        productivity,
        attendanceSessions: userAttendance.length,
        workSessions: userTimeLogs.length,
      });
    });

    // Sort by productivity descending
    const sortedData = Array.from(userMap.values()).sort((a, b) => b.productivity - a.productivity);
    setProductivityData(sortedData);
    setLoading(false);
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getProductivityColor = (productivity: number) => {
    if (productivity >= 80) return 'text-green-600 dark:text-green-400';
    if (productivity >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (productivity >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (productivity: number) => {
    if (productivity >= 80) return 'bg-green-500';
    if (productivity >= 60) return 'bg-yellow-500';
    if (productivity >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (periodType === 'week') {
      setCurrentPeriod(direction === 'prev' ? subWeeks(currentPeriod, 1) : addWeeks(currentPeriod, 1));
    } else {
      setCurrentPeriod(direction === 'prev' ? subMonths(currentPeriod, 1) : addMonths(currentPeriod, 1));
    }
  };

  const getPeriodLabel = () => {
    if (periodType === 'week') {
      const start = startOfWeek(currentPeriod, { weekStartsOn: 1 });
      const end = endOfWeek(currentPeriod, { weekStartsOn: 1 });
      return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`;
    }
    return format(currentPeriod, 'MMMM yyyy', { locale: es });
  };

  // Calculate totals
  const totalAttendance = productivityData.reduce((sum, u) => sum + u.attendanceMinutes, 0);
  const totalWork = productivityData.reduce((sum, u) => sum + u.workMinutes, 0);
  const averageProductivity = productivityData.length > 0
    ? Math.round(productivityData.reduce((sum, u) => sum + u.productivity, 0) / productivityData.length)
    : 0;

  if (authLoading || orgLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Productividad
            </h1>
            <p className="text-muted-foreground">Análisis de rendimiento del equipo</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={periodType} onValueChange={(v: 'week' | 'month') => setPeriodType(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semanal</SelectItem>
                <SelectItem value="month">Mensual</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigatePeriod('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-muted rounded-lg text-sm font-medium min-w-[180px] text-center">
              {getPeriodLabel()}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigatePeriod('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                if (productivityData.length === 0) return toast.info('Nada que exportar');
                downloadCsv(`productividad-${periodType}`, productivityData, [
                  { key: 'name', label: 'Empleado', value: (r) => r.full_name },
                  { key: 'role', label: 'Rol', value: (r) => r.role ? ROLE_LABELS[r.role] : '' },
                  { key: 'attendance', label: 'Tiempo en taller', value: (r) => formatMinutes(r.attendanceMinutes) },
                  { key: 'work', label: 'Tiempo en tareas', value: (r) => formatMinutes(r.workMinutes) },
                  { key: 'productivity', label: 'Productividad %', value: (r) => `${r.productivity}%` },
                  { key: 'attendance_sessions', label: 'Fichajes', value: (r) => r.attendanceSessions },
                  { key: 'work_sessions', label: 'Sesiones trabajo', value: (r) => r.workSessions },
                ]);
              }}
            >
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Empleados</p>
                  <p className="text-2xl font-bold">{productivityData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Horas Asistencia</p>
                  <p className="text-2xl font-bold">{formatDuration(totalAttendance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Wrench className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Horas Trabajadas</p>
                  <p className="text-2xl font-bold">{formatDuration(totalWork)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Productividad Media</p>
                  <p className={`text-2xl font-bold ${getProductivityColor(averageProductivity)}`}>
                    {averageProductivity}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Productivity List */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : productivityData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Sin datos de productividad</p>
              <p className="text-muted-foreground">No hay registros de asistencia o trabajo para este período</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {productivityData.map(user => (
              <Card key={user.user_id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.full_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {user.role ? ROLE_LABELS[user.role] : 'Usuario'}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${getProductivityColor(user.productivity)}`}>
                        {user.productivity}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`absolute left-0 top-0 h-full transition-all ${getProgressColor(user.productivity)}`}
                        style={{ width: `${user.productivity}%` }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">Asistencia</span>
                        </div>
                        <p className="font-semibold">{formatDuration(user.attendanceMinutes)}</p>
                        <p className="text-xs text-muted-foreground">{user.attendanceSessions} sesiones</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Wrench className="h-3 w-3" />
                          <span className="text-xs">Trabajado</span>
                        </div>
                        <p className="font-semibold">{formatDuration(user.workMinutes)}</p>
                        <p className="text-xs text-muted-foreground">{user.workSessions} tareas</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
