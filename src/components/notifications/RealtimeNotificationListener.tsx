import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function RealtimeNotificationListener() {
  // Activate realtime notifications (in-app toasts + sounds)
  useRealtimeNotifications();
  // Activate push notifications (native OS notifications even when app is closed)
  usePushNotifications();
  return null;
}
