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
      // Hydrate from DB so the UI shows the real state across app launches.
      if (!profile?.id) return;
      const platform = Capacitor.getPlatform();
      supabase
        .from('push_subscriptions')
        .select('endpoint')
        .eq('profile_id', profile.id)
        .like('endpoint', `capacitor:${platform}:%`)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setIsSubscribed(true);
        });
      return;
    }
    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await (registration as any).pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    });
  }, [isSupported, profile?.id]);

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
        if (perm.receive === 'denied') {
          toast.error(
            'Go to iPhone Settings → R@lly → Notifications and turn on Allow Notifications',
            { duration: 7000 }
          );
          try {
            const { App } = await import('@capacitor/app');
            await App.openUrl({ url: 'app-settings:' });
          } catch {
            /* noop — deep link best-effort */
          }
          return false;
        }
        if (perm.receive !== 'granted') {
          toast.error('Notification permission not granted');
          return false;
        }

        // Race APNs registration against a 4.5s timeout. On timeout, fall back
        // to a sentinel "realtime" endpoint so the user still receives in-app
        // realtime notifications even if APNs registration hangs.
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const tokenPromise = new Promise<string | null>((resolve, reject) => {
          let settled = false;
          const settle = (fn: () => void) => {
            if (settled) return;
            settled = true;
            if (timeoutId) clearTimeout(timeoutId);
            fn();
          };
          const okHandle = PushNotifications.addListener('registration', (t) => {
            okHandle.then((h) => h.remove()).catch(() => {});
            settle(() => resolve(t.value));
          });
          const errHandle = PushNotifications.addListener('registrationError', (err) => {
            errHandle.then((h) => h.remove()).catch(() => {});
            settle(() => reject(new Error(err?.error ?? 'Push registration failed')));
          });
          timeoutId = setTimeout(() => settle(() => resolve(null)), 4500);
        });

        await PushNotifications.register();
        let deviceToken: string | null;
        try {
          deviceToken = await tokenPromise;
        } catch (err) {
          // APNs registration explicitly errored — fall back to realtime too.
          console.warn('Push registration error, falling back to realtime:', err);
          deviceToken = null;
        }

        const platform = Capacitor.getPlatform(); // 'ios' | 'android'

        if (!deviceToken) {
          const endpoint = `capacitor:${platform}:realtime-fallback:${profile.id}`;
          await saveSubscriptionRow(profile.id, endpoint, 'realtime', 'realtime');
          setIsSubscribed(true);
          toast.success('Notifications enabled (in-app)');
          return true;
        }

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
