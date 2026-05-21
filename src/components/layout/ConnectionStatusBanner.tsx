import { useEffect, useState } from 'react';
import { WifiOff, Wifi, CloudUpload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeQueueCount, drainPaymentQueue } from '@/lib/paymentQueue';
import { addNetworkListener, isOnlineSync } from '@/lib/nativeNetwork';

/**
 * Global connection status banner.
 * - Shows a R@lly-orange "Reconnecting…" bar when offline.
 * - Shows a brief success bar when connection is restored, then auto-hides.
 * - Surfaces queued offline payment count and offers a manual retry.
 * Mounted once in App.tsx so it overlays every route.
 *
 * Uses @/lib/nativeNetwork so WKWebView reports network status via
 * @capacitor/network instead of the unreliable navigator.onLine.
 */
export function ConnectionStatusBanner() {
  const [isOnline, setIsOnline] = useState(isOnlineSync());
  const [showRecovered, setShowRecovered] = useState(false);
  const [queued, setQueued] = useState(0);
  const [draining, setDraining] = useState(false);

  useEffect(() => {
    let recoveredTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = addNetworkListener((connected) => {
      if (connected) {
        setIsOnline(true);
        setShowRecovered(true);
        if (recoveredTimer) clearTimeout(recoveredTimer);
        recoveredTimer = setTimeout(() => setShowRecovered(false), 2500);
      } else {
        setIsOnline(false);
        setShowRecovered(false);
      }
    });
    return () => {
      unsubscribe();
      if (recoveredTimer) clearTimeout(recoveredTimer);
    };
  }, []);

  useEffect(() => subscribeQueueCount(setQueued), []);

  // Show the payment-queue banner whenever there are queued items, even when online.
  const showQueueBanner = queued > 0 && isOnline && !showRecovered;

  if (isOnline && !showRecovered && !showQueueBanner) return null;

  if (showQueueBanner) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-[100] px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium bg-amber-500 text-white shadow-lg"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}
      >
        <CloudUpload className="w-4 h-4" />
        <span>
          {queued} payment{queued === 1 ? '' : 's'} waiting to send
        </span>
        <button
          onClick={async () => {
            setDraining(true);
            try { await drainPaymentQueue(); } finally { setDraining(false); }
          }}
          disabled={draining}
          className="ml-2 underline-offset-2 underline disabled:opacity-60"
        >
          {draining ? 'Retrying…' : 'Retry now'}
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-0 inset-x-0 z-[100] px-4 py-2 text-center text-sm font-medium',
        'flex items-center justify-center gap-2 shadow-lg',
        'transition-all duration-300',
        !isOnline
          ? 'bg-primary text-primary-foreground animate-pulse'
          : 'bg-emerald-600 text-white'
      )}
      style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Reconnecting… Hold tight.</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4" />
          <span>Back online</span>
        </>
      )}
    </div>
  );
}
