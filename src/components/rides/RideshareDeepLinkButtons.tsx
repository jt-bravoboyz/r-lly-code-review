import { useHaptics } from '@/hooks/useHaptics';
import { trackEvent } from '@/lib/analytics';
import uberIcon from '@/assets/uber-app-icon.png';
import lyftIcon from '@/assets/lyft-app-icon.png';

interface RideshareDeepLinkButtonsProps {
  eventLat?: number | null;
  eventLng?: number | null;
  eventName?: string | null;
  eventAddress?: string | null;
}

/** Squircle Uber app icon — true black app tile */
const UberAppIcon = () => (
  <div
    className="shrink-0 overflow-hidden"
    style={{
      width: 40,
      height: 40,
      borderRadius: 9,
      background: '#000000',
      boxShadow:
        '0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
    }}
    aria-hidden
  >
    <img
      src={uberIcon}
      alt=""
      className="w-full h-full"
      style={{ objectFit: 'contain' }}
      draggable={false}
    />
  </div>
);

/** Squircle Lyft app icon — true magenta app tile */
const LyftAppIcon = () => (
  <div
    className="shrink-0 overflow-hidden"
    style={{
      width: 40,
      height: 40,
      borderRadius: 9,
      background: '#FF00BF',
      boxShadow:
        '0 2px 8px rgba(255,0,191,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
    }}
    aria-hidden
  >
    <img
      src={lyftIcon}
      alt=""
      className="w-full h-full"
      style={{ objectFit: 'cover' }}
      draggable={false}
    />
  </div>
);

export function RideshareDeepLinkButtons({
  eventLat,
  eventLng,
  eventName,
  eventAddress,
}: RideshareDeepLinkButtonsProps) {
  const { triggerButtonFeedback } = useHaptics();

  const hasCoords =
    typeof eventLat === 'number' &&
    typeof eventLng === 'number' &&
    eventLat !== 0 &&
    eventLng !== 0;

  const launchWithFallback = (nativeUrl: string, storeUrl: string) => {
    const fallbackTimer = window.setTimeout(() => {
      window.location.href = storeUrl;
    }, 1500);
    const visibilityHandler = () => {
      if (document.hidden) {
        clearTimeout(fallbackTimer);
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    window.location.href = nativeUrl;
  };

  const openUber = () => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);
    const iosStoreUrl = 'https://apps.apple.com/app/uber/id368677368';
    const androidStoreUrl = 'https://play.google.com/store/apps/details?id=com.ubercab';

    let nativeParams = '';
    if (hasCoords) {
      nativeParams = `?action=setPickup&pickup=my_location&dropoff[latitude]=${eventLat}&dropoff[longitude]=${eventLng}`;
      if (eventName) nativeParams += `&dropoff[nickname]=${encodeURIComponent(eventName)}`;
      if (eventAddress) nativeParams += `&dropoff[formatted_address]=${encodeURIComponent(eventAddress)}`;
    }

    if (isAndroid) {
      const intentUrl = `intent://${nativeParams}#Intent;scheme=uber;package=com.ubercab;S.browser_fallback_url=${encodeURIComponent(androidStoreUrl)};end`;
      window.location.href = intentUrl;
      return;
    }
    launchWithFallback(`uber://${nativeParams}`, isIOS ? iosStoreUrl : iosStoreUrl);
  };

  const openLyft = () => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);
    const iosStoreUrl = 'https://apps.apple.com/app/lyft/id529379082';
    const androidStoreUrl = 'https://play.google.com/store/apps/details?id=me.lyft.android';

    const params = hasCoords
      ? `ridetype?id=lyft&pickup=current&destination[latitude]=${eventLat}&destination[longitude]=${eventLng}`
      : '';

    if (isAndroid) {
      const intentUrl = `intent://${params}#Intent;scheme=lyft;package=me.lyft.android;S.browser_fallback_url=${encodeURIComponent(androidStoreUrl)};end`;
      window.location.href = intentUrl;
      return;
    }
    launchWithFallback(`lyft://${params}`, isIOS ? iosStoreUrl : iosStoreUrl);
  };

  const handleClick = (provider: 'uber' | 'lyft') => {
    triggerButtonFeedback();
    trackEvent('rideshare_deeplink_clicked', { provider });
    if (provider === 'uber') openUber();
    else openLyft();
  };

  const buttons = [
    { key: 'uber' as const, label: 'Uber', Icon: UberAppIcon },
    { key: 'lyft' as const, label: 'Lyft', Icon: LyftAppIcon },
  ];

  return (
    <>
      <style>{`
        @keyframes rideshare-breath {
          0%, 100% {
            box-shadow:
              0 8px 24px rgba(0,0,0,0.10),
              inset 0 1px 0 rgba(255,255,255,0.18),
              inset 0 0 0 1px rgba(255,255,255,0.10),
              0 0 0 0 rgba(255,255,255,0);
          }
          50% {
            box-shadow:
              0 10px 28px rgba(0,0,0,0.14),
              inset 0 1px 0 rgba(255,255,255,0.28),
              inset 0 0 0 1px rgba(255,255,255,0.22),
              0 0 18px 0 rgba(255,255,255,0.10);
          }
        }
        .rideshare-glass-btn {
          animation: rideshare-breath 3.6s ease-in-out infinite;
          animation-delay: 0s;
        }
      `}</style>

      <div className="flex gap-3 w-full">
        {buttons.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleClick(key)}
            aria-label={`Open ${label} with destination pre-filled`}
            className={[
              'rideshare-glass-btn',
              'flex-1 h-[68px] rounded-2xl',
              'flex items-center justify-center gap-3 px-4',
              'bg-white/55 dark:bg-black/45',
              'backdrop-blur-xl',
              'border border-white/40 dark:border-white/10',
              'active:scale-[0.98] transition-transform duration-200 ease-out',
              'text-foreground relative overflow-hidden',
            ].join(' ')}
            style={{ WebkitBackdropFilter: 'blur(20px) saturate(1.4)' }}
          >
            <Icon />
            <div className="flex flex-col items-start leading-tight">
              <span className="font-montserrat font-semibold text-[15px] text-foreground">
                {label}
              </span>
              <span className="text-[11px] text-muted-foreground">Open app</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
