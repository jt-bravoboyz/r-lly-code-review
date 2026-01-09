import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { profile } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  // Fetch VAPID public key from edge function
  useEffect(() => {
    if (!isSupported) return;
    
    const fetchVapidKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-vapid-key');
        if (error) throw error;
        if (data?.vapidPublicKey) {
          setVapidPublicKey(data.vapidPublicKey);
        }
      } catch (err) {
        console.warn('Could not fetch VAPID key:', err);
      }
    };
    
    fetchVapidKey();
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) return;
    
    // Check current subscription status
    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    });
  }, [isSupported]);

  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  }, []);

  const subscribe = useCallback(async () => {
    if (!profile?.id) {
      toast.error('You must be logged in to enable notifications');
      return false;
    }

    if (!vapidPublicKey) {
      console.warn('VAPID public key not available');
      toast.error('Push notifications not configured');
      return false;
    }

    setIsLoading(true);
    
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      console.log('Push subscription:', subscription);

      const subscriptionJson = subscription.toJSON();
      
      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          profile_id: profile.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys!.p256dh,
          auth: subscriptionJson.keys!.auth
        }, {
          onConflict: 'profile_id,endpoint'
        });

      if (error) throw error;

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
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
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

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  };
}
