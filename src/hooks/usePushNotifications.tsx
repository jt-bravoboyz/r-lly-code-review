import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Push notifications:
 * - Web: standard Web Push (VAPID) via service worker.
 * - Native (iOS/Android): @capacitor/push-notifications → APNs/FCM token,
 *   stored in `push_subscriptions` with a sentinel endpoint prefix so the
 *   server-side dispatcher can route the message appropriately.
 *
 * NOTE: Server-side dispatch for APNs/FCM is a separate piece of work in
 * `send-push-notification`; this hook is responsible only for capturing
 * the token at sign-in time.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

const isNative = () => Capacitor.isNativePlatform();

async function saveSubscriptionRow(profileId: string, endpoint: string, p256dh: string, auth: string) {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { profile_id: profileId, endpoint, p256dh, auth },
      { onConflict: 'profile_id,endpoint' }
    );
  if (error) throw error;
}

export function usePushNotifications() {
  const { profile } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (isNative()) {
      setIsSupported(true);
      return;
    }
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  // Web only: fetch VAPID key.
  useEffect(() => {
    if (!isSupported || isNative()) return;

    const fetchVapidKey = async () => {
      try {
        const envVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (envVapidKey) {
          setVapidPublicKey(envVapidKey);
          return;
        }
        const { data, error } = await supabase.functions.invoke('get-vapid-key');
        if (error) throw error;
        if (data?.vapidPublicKey) setVapidPublicKey(data.vapidPublicKey);
      } catch (err) {
        console.warn('Could not fetch VAPID key:', err);
      }
    };

    fetchVapidKey();
  }, [isSupported]);

  // Reflect current subscription status.
  useEffect(() => {
    if (!isSupported) return;
    if (isNative()) {
      // On native we treat the presence of an APNs/FCM token row as "subscribed".
      // The subscribe() call below is idempotent so we leave this as best-effort.
      return;
    }
    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await (registration as any).pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    });
  }, [isSupported]);

  const registerServiceWorker = useCallback(async () => {
    if (isNative()) {
      throw new Error('Service workers are not used on native.');
    }
    if (!('serviceWorker' in navigator)) throw new Error('Service workers not supported');
    const registration = await navigator.serviceWorker.register('/sw.js');
    if (import.meta.env.DEV) console.log('Service Worker registered:', registration);
    return registration;
  }, []);

  const subscribe = useCallback(async () => {
    if (!profile?.id) {
      toast.error('You must be logged in to enable notifications');
      return false;
    }

    setIsLoading(true);
    try {
      if (isNative()) {
        // Native APNs / FCM path
        const { PushNotifications } = await import('@capacitor/push-notifications');

        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') {
          toast.error('Notification permission denied');
          return false;
        }

        const tokenPromise = new Promise<string>((resolve, reject) => {
          const okHandle = PushNotifications.addListener('registration', (t) => {
            okHandle.then((h) => h.remove()).catch(() => {});
            resolve(t.value);
          });
          const errHandle = PushNotifications.addListener('registrationError', (err) => {
            errHandle.then((h) => h.remove()).catch(() => {});
            reject(new Error(err?.error ?? 'Push registration failed'));
          });
          setTimeout(() => reject(new Error('Push registration timed out')), 15_000);
        });

        await PushNotifications.register();
        const deviceToken = await tokenPromise;

        // Encode platform in the endpoint sentinel so server-side dispatch
        // can route to APNs vs FCM vs Web Push without a schema migration.
        const platform = Capacitor.getPlatform(); // 'ios' | 'android'
        const endpoint = `capacitor:${platform}:${deviceToken}`;
        await saveSubscriptionRow(profile.id, endpoint, 'native', 'native');

        setIsSubscribed(true);
        toast.success('Push notifications enabled!');
        return true;
      }

      // Web path
      if (!vapidPublicKey) {
        toast.error('Push notifications not configured');
        return false;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return false;
      }
      const registration = await registerServiceWorker();
      await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
      const subscriptionJson = subscription.toJSON();
      await saveSubscriptionRow(
        profile.id,
        subscriptionJson.endpoint!,
        subscriptionJson.keys!.p256dh,
        subscriptionJson.keys!.auth
      );

      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
      return true;
    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      toast.error(error.message || 'Failed to enable notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, registerServiceWorker, vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    if (!profile?.id) return false;
    setIsLoading(true);
    try {
      if (isNative()) {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        try {
          await PushNotifications.removeAllListeners();
        } catch {/* ignore */}
        const platform = Capacitor.getPlatform();
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('profile_id', profile.id)
          .like('endpoint', `capacitor:${platform}:%`);
        setIsSubscribed(false);
        toast.success('Push notifications disabled');
        return true;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('profile_id', profile.id)
          .eq('endpoint', subscription.endpoint);
      }
      setIsSubscribed(false);
      toast.success('Push notifications disabled');
      return true;
    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe };
}
