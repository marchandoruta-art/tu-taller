import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { Navigate } from 'react-router-dom';
import { ROLE_LABELS, UserRole } from '@/lib/types';

interface AttendanceWithUser {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number | null;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
  role?: UserRole;
}

interface UserSummary {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  role?: UserRole;
  totalMinutes: number;
  sessions: number;
}

export default function AdminAttendance() {
  const { role, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AttendanceWithUser[]>([]);
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (role === 'admin') {
      fetchAttendanceLogs();
    }
  }, [role, currentWeek]);

  const fetchAttendanceLogs = async () => {
    setLoading(true);
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

    // Fetch attendance logs
    const { data: logsData } = await supabase
      .from('attendance_logs')
      .select('*')
      .gte('clock_in', weekStart.toISOString())
      .lte('clock_in', weekEnd.toISOString())
      .order('clock_in', { ascending: false });

    if (!logsData) {
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(logsData.map(log => log.user_id))];

    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    // Fetch roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    // Combine data
    const enrichedLogs: AttendanceWithUser[] = logsData.map(log => ({
      ...log,
      profile: profiles?.find(p => p.user_id === log.user_id),
      role: roles?.find(r => r.user_id === log.user_id)?.role as UserRole,
    }));

    setLogs(enrichedLogs);

    // Calculate user summaries
    const summaryMap = new Map<string, UserSummary>();
    enrichedLogs.forEach(log => {
      const existing = summaryMap.get(log.user_id);
      if (existing) {
        existing.totalMinutes += log.total_minutes || 0;
        existing.sessions += 1;
      } else {
        summaryMap.set(log.user_id, {
          user_id: log.user_id,
          full_name: log.profile?.full_name || 'Usuario',
          avatar_url: log.profile?.avatar_url,
          role: log.role,
          totalMinutes: log.total_minutes || 0,
          sessions: 1,
        });
      }
    });

    setUserSummaries(Array.from(summaryMap.values()));
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

  const filteredSummaries = userSummaries.filter(user =>
    user.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLogs = logs.filter(log =>
    log.profile?.full_name.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) {
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
            <h1 className="text-2xl font-bold">Control Horario</h1>
            <p className="text-muted-foreground">Gestión de asistencia de empleados</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-muted rounded-lg text-sm font-medium">
              {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'd MMM', { locale: es })}
              {' - '}
              {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: es })}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empleado..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* User Summaries */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSummaries.map(user => (
                <Card key={user.user_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.role ? ROLE_LABELS[user.role] : 'Usuario'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="p-3 bg-primary/5 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Horas totales</p>
                        <p className="font-bold text-primary">{formatDuration(user.totalMinutes)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Sesiones</p>
                        <p className="font-bold">{user.sessions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Registros Detallados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay registros para esta semana
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredLogs.map(log => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={log.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(log.profile?.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{log.profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.clock_in), 'EEEE d MMM', { locale: es })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {format(new Date(log.clock_in), 'HH:mm', { locale: es })}
                            {' → '}
                            {log.clock_out
                              ? format(new Date(log.clock_out), 'HH:mm', { locale: es })
                              : 'En curso'}
                          </p>
                          {log.total_minutes && (
                            <p className="text-xs text-primary font-medium">
                              {formatDuration(log.total_minutes)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
