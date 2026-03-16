import { useState, useEffect, forwardRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineOperation } from '@/hooks/useOfflineOperation';
import { cacheData, getCachedData, addToCachedData } from '@/lib/offlineStorage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, LogOut, Clock, Stethoscope, Coffee, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/notificationSound';
import { requestNotificationPermission, sendBrowserNotification } from '@/lib/browserNotification';
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
  organization_id: string | null;
}

const EXIT_TYPES = {
  normal: { label: 'Salida Normal', icon: LogOut },
  medico: { label: 'Salida Médico', icon: Stethoscope },
  descanso: { label: 'Descanso', icon: Coffee },
  desayuno: { label: 'Desayuno', icon: UtensilsCrossed },
} as const;

export const AttendanceClock = forwardRef<HTMLDivElement>(function AttendanceClock(_, ref) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { executeInsert, executeUpdate, isOnline } = useOfflineOperation();
  const [activeSession, setActiveSession] = useState<AttendanceLog | null>(null);
  const [todayLogs, setTodayLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTodayLogs();
      try {
        requestNotificationPermission();
      } catch (e) {
        console.warn('Notification permission request failed:', e);
      }
    }
  }, [user]);

  const [eightHourAlertShown, setEightHourAlertShown] = useState(false);
  const [autoStoppedAt8h, setAutoStoppedAt8h] = useState(false);

  // Update elapsed time for active session
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeSession) {
      const updateElapsed = () => {
        try {
          const start = new Date(activeSession.clock_in);
          const now = new Date();
          const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
          setElapsed(Math.max(0, diff));
        } catch (e) {
          console.error('Error calculating elapsed time:', e);
        }
      };
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  // 8-hour alarm: check total accumulated today + active session, auto clock-out
  useEffect(() => {
    if (eightHourAlertShown) return;
    try {
      const completedMinutes = todayLogs.reduce((acc, log) => acc + (log.total_minutes || 0), 0);
      const activeMinutes = Math.floor(elapsed / 60);
      const totalMinutes = completedMinutes + activeMinutes;
      if (totalMinutes >= 480) {
        setEightHourAlertShown(true);
        playNotificationSound(true);
        toast.warning('⏰ ¡Jornada de 8 horas completada!', {
          description: 'Se ha registrado tu salida automáticamente.',
          duration: 15000,
        });
        try {
          sendBrowserNotification('⏰ Jornada completada', {
            body: '¡Has cumplido 8 horas! Se registró tu salida automáticamente.',
            tag: 'attendance-8h',
          });
        } catch (e) {
          console.warn('Browser notification failed:', e);
        }
        // Auto clock-out
        if (activeSession && !autoStoppedAt8h) {
          setAutoStoppedAt8h(true);
          clockOut('normal');
        }
      }
    } catch (e) {
      console.error('Error in 8h check:', e);
    }
  }, [elapsed, todayLogs, eightHourAlertShown, activeSession, autoStoppedAt8h]);

  // Reset 8h alert when session changes (new day)
  useEffect(() => {
    setEightHourAlertShown(false);
  }, [activeSession?.id]);

  // Daily 7:55 reminder to clock in
  useEffect(() => {
    const checkReminder = () => {
      try {
        const now = new Date();
        if (now.getHours() === 7 && now.getMinutes() === 55 && !activeSession) {
          toast.info('🕗 Recuerda fichar tu entrada', {
            description: 'Son las 7:55, ¡empieza tu jornada!',
            duration: 30000,
          });
        }
      } catch (e) {
        console.warn('Reminder check failed:', e);
      }
    };
    const interval = setInterval(checkReminder, 30000);
    checkReminder();
    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchTodayLogs = async () => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const [activeRes, todayRes] = await Promise.all([
        supabase
          .from('attendance_logs')
          .select('*')
          .eq('user_id', user.id)
          .is('clock_out', null)
          .order('clock_in', { ascending: false })
          .limit(1),
        supabase
          .from('attendance_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('clock_in', today.toISOString())
          .order('clock_in', { ascending: false }),
      ]);

      if (activeRes.error || todayRes.error) {
        throw activeRes.error || todayRes.error;
      }

      const activeSessionData = activeRes.data?.[0] as AttendanceLog | undefined;
      const todayData = (todayRes.data || []) as AttendanceLog[];

      if (activeSessionData && !todayData.find(log => log.id === activeSessionData.id)) {
        todayData.unshift(activeSessionData);
      }

      setTodayLogs(todayData);
      setActiveSession(activeSessionData || null);
      setError(null);

      try {
        await cacheData('attendance_logs', todayData);
      } catch (cacheErr) {
        console.warn('Failed to cache attendance data:', cacheErr);
      }
    } catch (fetchError) {
      console.error('Error fetching attendance logs:', fetchError);
      // Try loading from cache
      try {
        const cachedLogs = await getCachedData<AttendanceLog>('attendance_logs');
        const filteredLogs = cachedLogs
          .filter(log => log.user_id === user.id)
          .filter(log => !log.clock_out || new Date(log.clock_in) >= today)
          .sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());

        setTodayLogs(filteredLogs);
        setActiveSession(filteredLogs.find(log => !log.clock_out) || null);
      } catch (cacheError) {
        console.error('Error loading cached attendance logs:', cacheError);
        // Still show the component, just empty
        setTodayLogs([]);
        setActiveSession(null);
        setError('No se pudieron cargar los registros. Comprueba tu conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clockIn = async () => {
    if (!user) return;

    if (!organizationId) {
      toast.error('No se pudo detectar tu organización. Vuelve a iniciar sesión.');
      return;
    }

    try {
      const newLog = {
        user_id: user.id,
        organization_id: organizationId,
        clock_in: new Date().toISOString(),
      };

      const result = await executeInsert('attendance_logs', newLog);

      if (result.success && result.data) {
        const logData = result.data as unknown as AttendanceLog;
        setActiveSession(logData);
        setTodayLogs(prev => [logData, ...prev]);
        setError(null);
        try {
          await addToCachedData('attendance_logs', logData);
        } catch (e) {
          console.warn('Failed to cache new log:', e);
        }
        toast.success(result.offline ? 'Entrada registrada (offline)' : 'Entrada registrada');
      }
    } catch (err) {
      console.error('Clock in error:', err);
      toast.error('Error al registrar entrada. Inténtalo de nuevo.');
    }
  };

  const clockOut = async (exitType: string = 'normal') => {
    if (!activeSession) return;

    try {
      const totalMinutes = Math.floor(elapsed / 60);
      const nowIso = new Date().toISOString();

      const result = await executeUpdate('attendance_logs', activeSession.id, {
        clock_out: nowIso,
        total_minutes: totalMinutes,
        exit_type: exitType,
      });

      if (result.success) {
        const updatedLog: AttendanceLog = {
          ...activeSession,
          clock_out: nowIso,
          total_minutes: totalMinutes,
          exit_type: exitType,
        };

        setActiveSession(null);
        setElapsed(0);

        if (!result.offline) {
          fetchTodayLogs();
        } else {
          setTodayLogs(prev => prev.map(log =>
            log.id === activeSession.id ? updatedLog : log
          ));
          try {
            await addToCachedData('attendance_logs', updatedLog);
          } catch (e) {
            console.warn('Failed to cache updated log:', e);
          }
        }

        toast.success(result.offline
          ? `${EXIT_TYPES[exitType as keyof typeof EXIT_TYPES]?.label || 'Salida'} registrada (offline)`
          : `${EXIT_TYPES[exitType as keyof typeof EXIT_TYPES]?.label || 'Salida'} registrada`
        );
      }
    } catch (err) {
      console.error('Clock out error:', err);
      toast.error('Error al registrar salida. Inténtalo de nuevo.');
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
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setLoading(true); setError(null); fetchTodayLogs(); }}
              className="ml-auto text-xs"
            >
              Reintentar
            </Button>
          </div>
        )}

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
