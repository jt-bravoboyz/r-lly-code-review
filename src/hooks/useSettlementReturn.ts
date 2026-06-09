import { useEffect, useRef, useCallback } from 'react';
import { App } from '@capacitor/app';

/**
 * Detects when the app returns to foreground after opening a payment deep link.
 * When a settlement is being watched, fires `onReturn` with that settlement id.
 *
 * Safe on web — Capacitor's App plugin no-ops outside native, but the listener
 * registration still resolves cleanly so the hook can run anywhere.
 */
export function useSettlementReturn(
  onReturn: (settlementId: string) => void
) {
  const pendingIdRef = useRef<string | null>(null);
  const onReturnRef = useRef(onReturn);

  useEffect(() => {
    onReturnRef.current = onReturn;
  }, [onReturn]);

  useEffect(() => {
    const listenerPromise = App.addListener('appStateChange', (state) => {
      if (state.isActive && pendingIdRef.current) {
        const id = pendingIdRef.current;
        pendingIdRef.current = null;
        onReturnRef.current(id);
      }
    });

    // Web fallback: detect tab visibility returning, in case the user
    // opened venmo.com / cash.app / paypal.me in another tab.
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && pendingIdRef.current) {
        const id = pendingIdRef.current;
        pendingIdRef.current = null;
        onReturnRef.current(id);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      listenerPromise.then((l) => l.remove()).catch(() => {});
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const startWatching = useCallback((settlementId: string) => {
    pendingIdRef.current = settlementId;
  }, []);

  const stopWatching = useCallback(() => {
    pendingIdRef.current = null;
  }, []);

  return { startWatching, stopWatching };
}
