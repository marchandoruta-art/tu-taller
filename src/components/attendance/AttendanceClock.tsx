import { useState, useEffect, forwardRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineOperation } from '@/hooks/useOfflineOperation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, LogOut, Clock, Stethoscope, Coffee, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AttendanceLog {
  id: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number | null;
  exit_type: string | null;
  user_id: string;
}

const EXIT_TYPES = {
  normal: { label: 'Salida Normal', icon: LogOut },
  medico: { label: 'Salida Médico', icon: Stethoscope },
  descanso: { label: 'Descanso', icon: Coffee },
  desayuno: { label: 'Desayuno', icon: UtensilsCrossed },
} as const;

export const AttendanceClock = forwardRef<HTMLDivElement>(function AttendanceClock(_, ref) {
  const { user } = useAuth();
  const { executeInsert, executeUpdate, isOnline } = useOfflineOperation();
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
      setTodayLogs(data as AttendanceLog[]);
      const active = data.find(log => !log.clock_out);
      setActiveSession(active as AttendanceLog || null);
    }
    setLoading(false);
  };

  const clockIn = async () => {
    if (!user) return;

    try {
      const newLog = {
        user_id: user.id,
        clock_in: new Date().toISOString(),
      };

      const result = await executeInsert('attendance_logs', newLog);

      if (result.success && result.data) {
        const logData = result.data as unknown as AttendanceLog;
        setActiveSession(logData);
        setTodayLogs(prev => [logData, ...prev]);
        toast.success(result.offline ? 'Entrada registrada (offline)' : 'Entrada registrada');
      }
    } catch (error) {
      toast.error('Error al registrar entrada');
    }
  };

  const clockOut = async (exitType: string = 'normal') => {
    if (!activeSession) return;

    try {
      const totalMinutes = Math.floor(elapsed / 60);

      const result = await executeUpdate('attendance_logs', activeSession.id, {
        clock_out: new Date().toISOString(),
        total_minutes: totalMinutes,
        exit_type: exitType,
      });

      if (result.success) {
        setActiveSession(null);
        setElapsed(0);
        if (!result.offline) {
          fetchTodayLogs();
        } else {
          // Update local state for offline mode
          setTodayLogs(prev => prev.map(log => 
            log.id === activeSession.id 
              ? { ...log, clock_out: new Date().toISOString(), total_minutes: totalMinutes, exit_type: exitType }
              : log
          ));
        }
        toast.success(result.offline 
          ? `${EXIT_TYPES[exitType as keyof typeof EXIT_TYPES]?.label || 'Salida'} registrada (offline)` 
          : `${EXIT_TYPES[exitType as keyof typeof EXIT_TYPES]?.label || 'Salida'} registrada`
        );
      }
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

  const getExitTypeLabel = (exitType: string | null) => {
    if (!exitType) return '';
    return EXIT_TYPES[exitType as keyof typeof EXIT_TYPES]?.label || exitType;
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-muted rounded-xl" />;
  }

  return (
    <Card ref={ref}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Control Horario
          {!isOnline && <span className="text-xs text-yellow-500 ml-2">(Offline)</span>}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="destructive" className="w-full gap-2">
                    <LogOut className="h-4 w-4" />
                    Registrar Salida
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48 bg-popover">
                  {Object.entries(EXIT_TYPES).map(([key, { label, icon: Icon }]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => clockOut(key)}
                      className="gap-2 cursor-pointer"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
                  <div className="flex flex-col">
                    <span>
                      {format(new Date(log.clock_in), 'HH:mm', { locale: es })}
                      {' → '}
                      {log.clock_out
                        ? format(new Date(log.clock_out), 'HH:mm', { locale: es })
                        : 'En curso...'}
                    </span>
                    {log.exit_type && log.exit_type !== 'normal' && (
                      <span className="text-xs text-muted-foreground">
                        {getExitTypeLabel(log.exit_type)}
                      </span>
                    )}
                  </div>
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
});
