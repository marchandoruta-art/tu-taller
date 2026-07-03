import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Returns the number of vehicles assigned to the current user that are still
 * pending work (en_reparacion or pendiente_piezas). Refreshes on realtime
 * changes to the vehicles table.
 */
export function usePendingAssignedCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const { count: c } = await supabase
        .from('vehicles')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('archived', false)
        .in('status', ['en_reparacion', 'pendiente_piezas']);
      if (!cancelled) setCount(c ?? 0);
    };

    load();

    const channel = supabase
      .channel(`pending-assigned-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}
