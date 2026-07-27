import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';

export interface ActiveVehicleTimer {
  id: string;
  vehicleId: string;
  userId: string;
  startedAt: string;
}

export type ActiveVehicleTimers = Record<string, ActiveVehicleTimer>;

export function useActiveVehicleTimers() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [timers, setTimers] = useState<ActiveVehicleTimers>({});

  const load = useCallback(async () => {
    if (!user || !organizationId) {
      setTimers({});
      return;
    }

    const { data, error } = await supabase
      .from('time_logs')
      .select('id, vehicle_id, user_id, started_at')
      .eq('organization_id', organizationId)
      .is('ended_at', null)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error loading active vehicle timers:', error);
      return;
    }

    const next: ActiveVehicleTimers = {};
    for (const timer of data ?? []) {
      if (!next[timer.vehicle_id]) {
        next[timer.vehicle_id] = {
          id: timer.id,
          vehicleId: timer.vehicle_id,
          userId: timer.user_id,
          startedAt: timer.started_at,
        };
      }
    }
    setTimers(next);
  }, [organizationId, user]);

  useEffect(() => {
    if (!user || !organizationId) {
      setTimers({});
      return;
    }

    void load();

    const channel = supabase
      .channel(`active-vehicle-timers-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => void load(),
      )
      .subscribe();

    const refresh = () => void load();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(channel);
    };
  }, [load, organizationId, user]);

  return { timers, refresh: load };
}