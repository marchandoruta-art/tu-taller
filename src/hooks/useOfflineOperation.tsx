import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';
import { addPendingOperation, addToCachedData } from '@/lib/offlineStorage';
import { toast } from 'sonner';
import { safeUUID } from '@/lib/uuid';

type ValidTable = 'time_logs' | 'vehicles' | 'vehicle_messages' | 'parts' | 'vehicle_anomalies' | 'attendance_logs';

export function useOfflineOperation() {
  const { isOnline } = useOnlineStatus();

  const executeInsert = useCallback(async <T extends Record<string, unknown>>(
    table: ValidTable,
    data: T,
    options?: { showToast?: boolean }
  ): Promise<{ success: boolean; data?: T & { id: string }; offline?: boolean }> => {
    const id = (data.id as string) || safeUUID();
    const dataWithId = { ...data, id } as T & { id: string };

    if (isOnline) {
      try {
        const { data: result, error } = await supabase
          .from(table)
          .insert(dataWithId as never)
          .select()
          .single();

        if (error) throw error;
        return { success: true, data: result as unknown as T & { id: string } };
      } catch (error) {
        console.error('Insert failed, saving offline:', error);
        // Fall through to offline handling
      }
    }

    // Offline mode or online insert failed
    await addPendingOperation({
      table,
      operation: 'insert',
      data: dataWithId as Record<string, unknown>,
    });
    await addToCachedData(table, dataWithId);

    if (options?.showToast !== false) {
      toast.info('Guardado localmente. Se sincronizará cuando vuelva la conexión.');
    }

    return { success: true, data: dataWithId, offline: true };
  }, [isOnline]);

  const executeUpdate = useCallback(async (
    table: ValidTable,
    id: string,
    data: Record<string, unknown>,
    options?: { showToast?: boolean }
  ): Promise<{ success: boolean; offline?: boolean }> => {
    const updateData = { ...data, id };

    if (isOnline) {
      try {
        const { error } = await supabase
          .from(table)
          .update(data as never)
          .eq('id', id);

        if (error) throw error;
        return { success: true };
      } catch (error) {
        console.error('Update failed, saving offline:', error);
        // Fall through to offline handling
      }
    }

    // Offline mode or online update failed
    await addPendingOperation({
      table,
      operation: 'update',
      data: updateData,
    });

    if (options?.showToast !== false) {
      toast.info('Cambio guardado localmente. Se sincronizará cuando vuelva la conexión.');
    }

    return { success: true, offline: true };
  }, [isOnline]);

  const executeDelete = useCallback(async (
    table: ValidTable,
    id: string,
    options?: { showToast?: boolean }
  ): Promise<{ success: boolean; offline?: boolean }> => {
    if (isOnline) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { success: true };
      } catch (error) {
        console.error('Delete failed, saving offline:', error);
        // Fall through to offline handling
      }
    }

    // Offline mode or online delete failed
    await addPendingOperation({
      table,
      operation: 'delete',
      data: { id },
    });

    if (options?.showToast !== false) {
      toast.info('Eliminación guardada localmente. Se sincronizará cuando vuelva la conexión.');
    }

    return { success: true, offline: true };
  }, [isOnline]);

  return {
    isOnline,
    executeInsert,
    executeUpdate,
    executeDelete,
  };
}
