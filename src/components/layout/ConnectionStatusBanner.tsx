import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Global connection status banner.
 * - Shows a R@lly-orange "Reconnecting…" bar when offline.
 * - Shows a brief success bar when connection is restored, then auto-hides.
 * Mounted once in App.tsx so it overlays every route.
 */
export function ConnectionStatusBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showRecovered, setShowRecovered] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRecovered(true);
      const t = setTimeout(() => setShowRecovered(false), 2500);
      return () => clearTimeout(t);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowRecovered(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showRecovered) return null;

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
