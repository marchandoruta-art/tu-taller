import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineOperation } from '@/hooks/useOfflineOperation';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Play, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkTimerProps {
  vehicleId: string;
  vehicleStatus?: string;
  onUpdate?: () => void;
}

export function WorkTimer({ vehicleId, vehicleStatus, onUpdate }: WorkTimerProps) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { executeInsert, executeUpdate, isOnline } = useOfflineOperation();
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for active timer on mount
  useEffect(() => {
    const checkActiveTimer = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('time_logs')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .eq('user_id', user.id)
          .is('ended_at', null)
          .maybeSingle();

        if (data) {
          setActiveLogId(data.id);
          setStartTime(new Date(data.started_at));
          setIsRunning(true);
        }
      } catch (error) {
        console.error('Error checking active timer:', error);
      } finally {
        setLoading(false);
      }
    };

    checkActiveTimer();
  }, [vehicleId, user]);

  // Update elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsed(diff);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  // Stop other active timers for this user, returns true if user confirmed / no conflict
  const stopOtherTimersWithConfirm = async (): Promise<boolean> => {
    if (!user) return false;

    // Find all active timers for this user on OTHER vehicles (with plate for the prompt)
    const { data: activeTimers } = await supabase
      .from('time_logs')
      .select('id, started_at, vehicle_id, vehicles(plate)')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .neq('vehicle_id', vehicleId);

    if (!activeTimers || activeTimers.length === 0) return true;

    const plates = activeTimers
      .map((t: any) => t.vehicles?.plate)
      .filter(Boolean)
      .join(', ');

    const ok = window.confirm(
      `Ya tienes un cronómetro activo en ${plates || 'otro vehículo'}.\n\n` +
      `Un operario no puede trabajar en dos coches a la vez.\n\n` +
      `¿Detener el cronómetro anterior y empezar este?`
    );
    if (!ok) return false;

    for (const timer of activeTimers) {
      const startedAt = new Date(timer.started_at);
      const now = new Date();
      const elapsedSec = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      const totalMinutes = elapsedSec > 0 ? Math.max(1, Math.ceil(elapsedSec / 60)) : 0;

      await executeUpdate('time_logs', timer.id, {
        ended_at: now.toISOString(),
        total_minutes: totalMinutes,
      }, { showToast: false });
    }

    toast.info(`Cronómetro anterior detenido (${plates})`);
    return true;
  };

  const startTimer = async () => {
    if (!user) return;

    try {
      // Block if another timer is running until user confirms
      const canStart = await stopOtherTimersWithConfirm();
      if (!canStart) return;

      const now = new Date();
      const result = await executeInsert('time_logs', {
        vehicle_id: vehicleId,
        user_id: user.id,
        started_at: now.toISOString(),
        organization_id: organizationId,
      });

      if (result.success && result.data) {
        setActiveLogId(result.data.id);
        setStartTime(now);
        setIsRunning(true);
        setElapsed(0);
        toast.success(result.offline ? 'Cronómetro iniciado (offline)' : 'Cronómetro iniciado');

        // Auto-change vehicle status from 'recibido' to 'en_reparacion'
        if (vehicleStatus === 'recibido') {
          await supabase
            .from('vehicles')
            .update({ status: 'en_reparacion' })
            .eq('id', vehicleId);
          toast.info('Vehículo pasado a "En Reparación" automáticamente');
          onUpdate?.();
        }
      }
    } catch (error) {
      toast.error('Error al iniciar el cronómetro');
    }
  };

  const stopTimer = async () => {
    if (!activeLogId) return;

    try {
      const totalMinutes = elapsed > 0 ? Math.max(1, Math.ceil(elapsed / 60)) : 0;

      const result = await executeUpdate('time_logs', activeLogId, {
        ended_at: new Date().toISOString(),
        total_minutes: totalMinutes,
      });

      if (result.success) {
        setIsRunning(false);
        setActiveLogId(null);
        setStartTime(null);
        const formattedTime = formatTime(elapsed);
        setElapsed(0);
        toast.success(result.offline 
          ? `Tiempo registrado (offline): ${formattedTime}` 
          : `Tiempo registrado: ${formattedTime}`
        );
        onUpdate?.();
      }
    } catch (error) {
      toast.error('Error al detener el cronómetro');
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
        <div className="timer-display text-muted-foreground">--:--:--</div>
        <div className="text-sm text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
      <div className={cn('timer-display', isRunning && 'text-primary')}>
        {formatTime(elapsed)}
      </div>
      <div className="flex gap-2 items-center">
        {!isRunning ? (
          <Button onClick={startTimer} size="sm" className="gap-2">
            <Play className="h-4 w-4" />
            Iniciar
          </Button>
        ) : (
          <Button onClick={stopTimer} size="sm" variant="destructive" className="gap-2">
            <StopCircle className="h-4 w-4" />
            Detener
          </Button>
        )}
        {!isOnline && <span className="text-xs text-yellow-500">(Offline)</span>}
      </div>
    </div>
  );
}
