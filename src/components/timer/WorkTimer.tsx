import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Play, Pause, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkTimerProps {
  vehicleId: string;
  onUpdate?: () => void;
}

export function WorkTimer({ vehicleId, onUpdate }: WorkTimerProps) {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Check for active timer on mount
  useEffect(() => {
    const checkActiveTimer = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('time_logs')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .single();

      if (data) {
        setActiveLogId(data.id);
        setStartTime(new Date(data.started_at));
        setIsRunning(true);
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

  const startTimer = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('time_logs')
        .insert([{ vehicle_id: vehicleId, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setActiveLogId(data.id);
      setStartTime(new Date(data.started_at));
      setIsRunning(true);
      setElapsed(0);
      toast.success('Cronómetro iniciado');
    } catch (error: any) {
      toast.error('Error al iniciar el cronómetro');
    }
  };

  const stopTimer = async () => {
    if (!activeLogId) return;

    try {
      const totalMinutes = Math.floor(elapsed / 60);

      const { error } = await supabase
        .from('time_logs')
        .update({
          ended_at: new Date().toISOString(),
          total_minutes: totalMinutes,
        })
        .eq('id', activeLogId);

      if (error) throw error;

      setIsRunning(false);
      setActiveLogId(null);
      setStartTime(null);
      setElapsed(0);
      toast.success(`Tiempo registrado: ${formatTime(elapsed)}`);
      onUpdate?.();
    } catch (error: any) {
      toast.error('Error al detener el cronómetro');
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
      <div className={cn('timer-display', isRunning && 'text-primary')}>
        {formatTime(elapsed)}
      </div>
      <div className="flex gap-2">
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
      </div>
    </div>
  );
}
