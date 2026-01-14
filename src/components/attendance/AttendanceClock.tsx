import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, LogOut, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AttendanceLog {
  id: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number | null;
}

export function AttendanceClock() {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<AttendanceLog | null>(null);
  const [todayLogs, setTodayLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (user) {
      fetchTodayLogs();
    }
  }, [user]);

  // Update elapsed time for active session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      const updateElapsed = () => {
        const start = new Date(activeSession.clock_in);
        const now = new Date();
        setElapsed(Math.floor((now.getTime() - start.getTime()) / 1000));
      };
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchTodayLogs = async () => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('clock_in', today.toISOString())
      .order('clock_in', { ascending: false });

    if (data) {
      setTodayLogs(data);
      const active = data.find(log => !log.clock_out);
      setActiveSession(active || null);
    }
    setLoading(false);
  };

  const clockIn = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .insert([{ user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setActiveSession(data);
      setTodayLogs(prev => [data, ...prev]);
      toast.success('Entrada registrada');
    } catch (error) {
      toast.error('Error al registrar entrada');
    }
  };

  const clockOut = async () => {
    if (!activeSession) return;

    try {
      const totalMinutes = Math.floor(elapsed / 60);

      const { error } = await supabase
        .from('attendance_logs')
        .update({
          clock_out: new Date().toISOString(),
          total_minutes: totalMinutes,
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      setActiveSession(null);
      setElapsed(0);
      fetchTodayLogs();
      toast.success('Salida registrada');
    } catch (error) {
      toast.error('Error al registrar salida');
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTodayTotal = () => {
    return todayLogs.reduce((acc, log) => acc + (log.total_minutes || 0), 0);
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-muted rounded-xl" />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Control Horario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clock In/Out Button */}
        <div className="flex flex-col items-center gap-4 p-4 bg-muted/50 rounded-xl">
          {activeSession ? (
            <>
              <div className="text-3xl font-mono font-bold text-primary">
                {formatTime(elapsed)}
              </div>
              <p className="text-sm text-muted-foreground">
                Entrada: {format(new Date(activeSession.clock_in), 'HH:mm', { locale: es })}
              </p>
              <Button onClick={clockOut} variant="destructive" className="w-full gap-2">
                <LogOut className="h-4 w-4" />
                Registrar Salida
              </Button>
            </>
          ) : (
            <Button onClick={clockIn} className="w-full gap-2" size="lg">
              <LogIn className="h-4 w-4" />
              Registrar Entrada
            </Button>
          )}
        </div>

        {/* Today's Summary */}
        <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
          <span className="text-sm font-medium">Total hoy:</span>
          <span className="font-bold text-primary">{formatDuration(getTodayTotal())}</span>
        </div>

        {/* Today's Logs */}
        {todayLogs.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Registros de hoy:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {todayLogs.map(log => (
                <div
                  key={log.id}
                  className="flex justify-between text-sm p-2 bg-muted/30 rounded"
                >
                  <span>
                    {format(new Date(log.clock_in), 'HH:mm', { locale: es })}
                    {' → '}
                    {log.clock_out
                      ? format(new Date(log.clock_out), 'HH:mm', { locale: es })
                      : 'En curso...'}
                  </span>
                  {log.total_minutes && (
                    <span className="text-muted-foreground">
                      {formatDuration(log.total_minutes)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
