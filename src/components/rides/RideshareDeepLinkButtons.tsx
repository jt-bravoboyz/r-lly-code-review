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

  const buildUberUrl = () => {
    if (!hasCoords) return 'https://m.uber.com/';
    let url = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${eventLat}&dropoff[longitude]=${eventLng}`;
    if (eventName) url += `&dropoff[nickname]=${encodeURIComponent(eventName)}`;
    if (eventAddress) url += `&dropoff[formatted_address]=${encodeURIComponent(eventAddress)}`;
    return url;
  };

  const buildLyftUrl = () => {
    if (!hasCoords) return 'https://lyft.com/';
    return `https://lyft.com/ride?id=lyft&pickup=current&destination[latitude]=${eventLat}&destination[longitude]=${eventLng}`;
  };

  const handleClick = (provider: 'uber' | 'lyft') => {
    triggerButtonFeedback();
    trackEvent('rideshare_deeplink_clicked', { provider });
    const url = provider === 'uber' ? buildUberUrl() : buildLyftUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
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
