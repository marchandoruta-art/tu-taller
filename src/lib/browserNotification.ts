// Browser Notification API utility for background/out-of-app alerts

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendBrowserNotification(
  title: string,
  options?: { body?: string; tag?: string; url?: string }
) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body: options?.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: options?.tag, // prevents duplicate notifications with same tag
    requireInteraction: true,
  });

  if (options?.url) {
    notification.onclick = () => {
      window.focus();
      window.location.href = options.url!;
      notification.close();
    };
  }
}
