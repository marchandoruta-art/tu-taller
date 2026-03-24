import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { Timer, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActiveTimer {
  id: string;
  vehicle_id: string;
  started_at: string;
  plate: string;
  brand: string;
  model: string;
}

export function ActiveTimerBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Poll for active timer
  useEffect(() => {
    if (!user) return;

    const fetchActive = async () => {
      try {
        const { data } = await supabase
          .from('time_logs')
          .select('id, vehicle_id, started_at')
          .eq('user_id', user.id)
          .is('ended_at', null)
          .limit(1)
          .maybeSingle();

        if (data) {
          // Fetch vehicle info
          const { data: vehicle } = await supabase
            .from('vehicles')
            .select('plate, brand, model')
            .eq('id', data.vehicle_id)
            .maybeSingle();

          if (vehicle) {
            setActiveTimer({
              ...data,
              plate: vehicle.plate,
              brand: vehicle.brand,
              model: vehicle.model,
            });
          } else {
            setActiveTimer(null);
          }
        } else {
          setActiveTimer(null);
        }
      } catch {
        // Silently fail
      }
    };

    fetchActive();
    const interval = setInterval(fetchActive, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Elapsed counter
  useEffect(() => {
    if (!activeTimer) { setElapsed(0); return; }

    const update = () => {
      const diff = Math.floor((Date.now() - new Date(activeTimer.started_at).getTime()) / 1000);
      setElapsed(Math.max(0, diff));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  if (!activeTimer) return null;

  // Don't show if already on that vehicle's detail page
  const isOnVehiclePage = location.pathname === `/vehicles/${activeTimer.vehicle_id}`;

  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const timeStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div
      onClick={() => !isOnVehiclePage && navigate(`/vehicles/${activeTimer.vehicle_id}`)}
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-4 py-3 rounded-full',
        'bg-primary text-primary-foreground shadow-lg',
        'transition-all duration-300 animate-in slide-in-from-bottom-4',
        !isOnVehiclePage && 'cursor-pointer hover:scale-105 active:scale-95'
      )}
    >
      <Timer className="h-4 w-4 animate-pulse" />
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="font-bold">{activeTimer.plate}</span>
        <span className="opacity-80 hidden sm:inline">
          {activeTimer.brand} {activeTimer.model}
        </span>
        <span className="font-mono tabular-nums">{timeStr}</span>
      </div>
      {!isOnVehiclePage && <ChevronRight className="h-4 w-4 opacity-70" />}
    </div>
  );
}
