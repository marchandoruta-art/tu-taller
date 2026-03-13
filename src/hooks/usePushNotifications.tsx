import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';
import { supabase } from '@/integrations/supabase/client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (user && supported) {
      initPush();
    }
  }, [user]);

  const initPush = async () => {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Check existing subscription
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        setIsSubscribed(true);
        // Ensure it's saved in DB (in case of re-login)
        await saveSubscription(existing);
        return;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return;
      }

      // Get VAPID public key from edge function
      const { data, error } = await supabase.functions.invoke('get-vapid-key');
      if (error || !data?.publicKey) {
        console.error('Failed to get VAPID key:', error);
        return;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
      });

      await saveSubscription(subscription);
      setIsSubscribed(true);
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  };

  const saveSubscription = async (subscription: PushSubscription) => {
    if (!user) return;

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) return;

    // Use raw query since push_subscriptions may not be in generated types
    const { error } = await supabase.from('push_subscriptions' as any).upsert(
      {
        user_id: user.id,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth_key: subJson.keys.auth,
        organization_id: organizationId,
      },
      { onConflict: 'user_id,endpoint' }
    );

    if (error) {
      console.error('Failed to save push subscription:', error);
    }
  };

  const sendPush = useCallback(async (params: {
    title: string;
    body: string;
    url?: string;
    type: string;
    user_ids?: string[];
    organization_id?: string;
  }) => {
    try {
      await supabase.functions.invoke('send-push', { body: params });
    } catch (error) {
      console.error('Error sending push:', error);
    }
  }, []);

  return { isSubscribed, isSupported, sendPush };
}
