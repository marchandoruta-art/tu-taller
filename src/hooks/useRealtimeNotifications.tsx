import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface RealtimeNotification {
  type: 'message' | 'vehicle_completed';
  title: string;
  message: string;
  vehicleId?: string;
  vehiclePlate?: string;
}

// Create a simple beep sound using Web Audio API
function playNotificationSound(isUrgent: boolean = false) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (isUrgent) {
      // Bell sound for vehicle completed - distinct chime pattern
      oscillator.frequency.value = 1047; // C6 note - high bell tone
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Second chime - lower
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 784; // G5 note
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.35, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.4);
      }, 200);

      // Third chime - back to high
      setTimeout(() => {
        const osc3 = audioContext.createOscillator();
        const gain3 = audioContext.createGain();
        osc3.connect(gain3);
        gain3.connect(audioContext.destination);
        osc3.frequency.value = 1047; // C6 note
        osc3.type = 'sine';
        gain3.gain.setValueAtTime(0.4, audioContext.currentTime);
        gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
        osc3.start(audioContext.currentTime);
        osc3.stop(audioContext.currentTime + 0.6);
      }, 450);
    } else {
      // Regular notification sound
      oscillator.frequency.value = 587.33; // D5 note
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }
  } catch (error) {
    console.log('Audio not available:', error);
  }
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
