import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';

/**
 * Returns the number of active work timers (time_logs with ended_at IS NULL)
 * in the current organization. Refreshes on realtime changes.
 */
export function useActiveTimersCount() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || !organizationId) {
      setCount(0);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const { count: c } = await supabase
        .from('time_logs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('ended_at', null);
      if (!cancelled) setCount(c ?? 0);
    };

    load();

    const channel = supabase
      .channel(`active-timers-count-${organizationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_logs' },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, organizationId]);

  return count;
}
