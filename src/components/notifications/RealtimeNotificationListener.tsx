import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export function RealtimeNotificationListener() {
  // This component just activates the realtime notifications hook
  useRealtimeNotifications();
  return null;
}
