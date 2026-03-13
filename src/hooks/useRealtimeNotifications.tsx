import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/notificationSound';
import { requestNotificationPermission, sendBrowserNotification } from '@/lib/browserNotification';

interface RealtimeNotification {
  type: 'message' | 'vehicle_completed';
  title: string;
  message: string;
  vehicleId?: string;
  vehiclePlate?: string;
}

export function useRealtimeNotifications() {
  const { user, role } = useAuth();
  const vehicleCacheRef = useRef<Map<string, { plate: string; brand: string; model: string }>>(new Map());

  const showNotification = useCallback((notification: RealtimeNotification) => {
    const isUrgent = notification.type === 'vehicle_completed';
    
    playNotificationSound(isUrgent);

    if (isUrgent) {
      toast.success(notification.title, {
        description: notification.message,
        duration: 10000,
        action: notification.vehicleId ? {
          label: 'Ver',
          onClick: () => {
            window.location.href = `/vehicles/${notification.vehicleId}`;
          },
        } : undefined,
      });
    } else {
      toast.info(notification.title, {
        description: notification.message,
        duration: 5000,
        action: notification.vehicleId ? {
          label: 'Ver',
          onClick: () => {
            window.location.href = `/vehicles/${notification.vehicleId}`;
          },
        } : undefined,
      });
    }
  }, []);

  // Fetch and cache vehicle info
  const getVehicleInfo = useCallback(async (vehicleId: string) => {
    if (vehicleCacheRef.current.has(vehicleId)) {
      return vehicleCacheRef.current.get(vehicleId)!;
    }

    const { data } = await supabase
      .from('vehicles')
      .select('plate, brand, model')
      .eq('id', vehicleId)
      .single();

    if (data) {
      vehicleCacheRef.current.set(vehicleId, data);
      return data;
    }

    return { plate: 'Desconocido', brand: '', model: '' };
  }, []);

  // Fetch user profile name
  const getUserName = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    return data?.full_name || 'Alguien';
  }, []);

  useEffect(() => {
    if (!user) return;
    requestNotificationPermission();
    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('global-messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicle_messages',
        },
        async (payload) => {
          const newMessage = payload.new as { 
            id: string; 
            vehicle_id: string; 
            user_id: string; 
            message: string;
          };

          // Don't notify for own messages
          if (newMessage.user_id === user.id) return;

          const [vehicleInfo, senderName] = await Promise.all([
            getVehicleInfo(newMessage.vehicle_id),
            getUserName(newMessage.user_id),
          ]);

          showNotification({
            type: 'message',
            title: `💬 Mensaje en ${vehicleInfo.plate}`,
            message: `${senderName}: ${newMessage.message.slice(0, 50)}${newMessage.message.length > 50 ? '...' : ''}`,
            vehicleId: newMessage.vehicle_id,
            vehiclePlate: vehicleInfo.plate,
          });

          sendBrowserNotification(`💬 Mensaje en ${vehicleInfo.plate}`, {
            body: `${senderName}: ${newMessage.message.slice(0, 80)}`,
            tag: `msg-${newMessage.id}`,
            url: `/vehicles/${newMessage.vehicle_id}`,
          });
        }
      )
      .subscribe();

    // Subscribe to vehicle status changes
    const vehiclesChannel = supabase
      .channel('global-vehicles-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vehicles',
        },
        async (payload) => {
          const oldVehicle = payload.old as { id: string; status: string };
          const newVehicle = payload.new as { 
            id: string; 
            status: string; 
            plate: string; 
            brand: string; 
            model: string;
          };

          // Only notify admins when status changes to 'terminado'
          if (oldVehicle.status !== 'terminado' && newVehicle.status === 'terminado') {
            // Cache the vehicle info
            vehicleCacheRef.current.set(newVehicle.id, {
              plate: newVehicle.plate,
              brand: newVehicle.brand,
              model: newVehicle.model,
            });

            // Only show notification to admins
            if (role === 'admin') {
              showNotification({
                type: 'vehicle_completed',
                title: `🔔 ¡Vehículo Terminado!`,
                message: `${newVehicle.plate} - ${newVehicle.brand} ${newVehicle.model} está listo para entregar`,
                vehicleId: newVehicle.id,
                vehiclePlate: newVehicle.plate,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(vehiclesChannel);
    };
  }, [user, role, showNotification, getVehicleInfo, getUserName]);

  return { playNotificationSound };
}
