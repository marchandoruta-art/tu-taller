import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  getPendingOperations, 
  removePendingOperation, 
  updatePendingOperationRetries,
  getPendingCount,
  PendingOperation 
} from '@/lib/offlineStorage';
import { useOnlineStatus } from './useOnlineStatus';
import { toast } from 'sonner';

const MAX_RETRIES = 3;

export function useOfflineSync() {
  const { isOnline, wasOffline, setWasOffline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const updatePendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const syncOperation = async (operation: PendingOperation): Promise<boolean> => {
    try {
      const { table, operation: op, data } = operation;
      
      // Type-safe table access
      const validTables = ['time_logs', 'vehicles', 'vehicle_messages', 'parts', 'vehicle_anomalies', 'attendance_logs'] as const;
      if (!validTables.includes(table as typeof validTables[number])) {
        console.error(`Invalid table: ${table}`);
        return false;
      }

      let result;
      
      switch (op) {
        case 'insert':
          result = await supabase.from(table as typeof validTables[number]).insert(data as never);
          break;
        case 'update':
          if (!data.id) throw new Error('Update requires id');
          const { id, ...updateData } = data;
          result = await supabase.from(table as typeof validTables[number]).update(updateData as never).eq('id', id as string);
          break;
        case 'delete':
          if (!data.id) throw new Error('Delete requires id');
          result = await supabase.from(table as typeof validTables[number]).delete().eq('id', data.id as string);
          break;
      }

      if (result?.error) {
        throw result.error;
      }

      return true;
    } catch (error) {
      console.error('Sync operation failed:', error);
      return false;
    }
  };

  const syncAllPending = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    const operations = await getPendingOperations();

    if (operations.length === 0) {
      setIsSyncing(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const operation of operations) {
      const success = await syncOperation(operation);

      if (success) {
        await removePendingOperation(operation.id);
        successCount++;
      } else {
        if (operation.retries >= MAX_RETRIES) {
          await removePendingOperation(operation.id);
          failCount++;
        } else {
          await updatePendingOperationRetries(operation.id, operation.retries + 1);
        }
      }
    }

    await updatePendingCount();
    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`${successCount} cambios sincronizados correctamente`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} cambios no pudieron sincronizarse`);
    }
  }, [isOnline, isSyncing, updatePendingCount]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      syncAllPending();
      setWasOffline(false);
    }
  }, [isOnline, wasOffline, syncAllPending, setWasOffline]);

  // Update pending count on mount
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // Periodic sync attempt
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      syncAllPending();
    }, 30000); // Try to sync every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, syncAllPending]);

  return {
    isSyncing,
    pendingCount,
    syncAllPending,
    updatePendingCount,
  };
}
