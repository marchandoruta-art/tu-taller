import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceClock } from '@/components/attendance/AttendanceClock';
import { Loader2, Clock, Calendar, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TimeLogWithVehicle {
  id: string;
  vehicle_id: string;
  started_at: string;
  ended_at: string | null;
  total_minutes: number;
  notes: string | null;
  vehicle: {
    plate: string;
    brand: string;
    model: string;
  };
}

export default function TimeLogs() {
  const { user } = useAuth();
  const [timeLogs, setTimeLogs] = useState<TimeLogWithVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeLogs = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('time_logs')
        .select('*, vehicle:vehicles(plate, brand, model)')
        .eq('user_id', user.id)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(50);

      if (data) {
        setTimeLogs(data as any);
      }
      setLoading(false);
    };

    fetchTimeLogs();
  }, [user]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTodayTotal = () => {
    const today = new Date().toDateString();
    return timeLogs
      .filter((log) => new Date(log.started_at).toDateString() === today)
      .reduce((acc, log) => acc + log.total_minutes, 0);
  };

  const getWeekTotal = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return timeLogs
      .filter((log) => new Date(log.started_at) >= weekAgo)
      .reduce((acc, log) => acc + log.total_minutes, 0);
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Registro de Tiempo</h1>
          <p className="text-muted-foreground">Control de jornada y reparaciones</p>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Attendance Clock */}
          <div className="lg:col-span-1">
            <AttendanceClock />
          </div>

          {/* Right Column - Repair time logs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Reparaciones Hoy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-mono">{formatDuration(getTodayTotal())}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Últimos 7 días
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-mono">{formatDuration(getWeekTotal())}</div>
                </CardContent>
              </Card>
            </div>

            {/* Time logs list */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historial de Reparaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay registros de tiempo
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {timeLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {log.vehicle.plate} - {log.vehicle.brand} {log.vehicle.model}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(log.started_at), "d 'de' MMMM, HH:mm", { locale: es })}
                              {' → '}
                              {log.ended_at && format(new Date(log.ended_at), 'HH:mm', { locale: es })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-medium text-lg">
                            {formatDuration(log.total_minutes)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
