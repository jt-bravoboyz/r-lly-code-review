import { useHaptics } from '@/hooks/useHaptics';
import { trackEvent } from '@/lib/analytics';

interface RideshareDeepLinkButtonsProps {
  eventLat?: number | null;
  eventLng?: number | null;
  eventName?: string | null;
  eventAddress?: string | null;
}

const UberWordmark = () => (
  <svg viewBox="0 0 60 24" className="h-3.5 w-auto" fill="currentColor" aria-hidden>
    <text x="0" y="18" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="20">Uber</text>
  </svg>
);

const LyftWordmark = () => (
  <svg viewBox="0 0 60 24" className="h-3.5 w-auto" fill="currentColor" aria-hidden>
    <text x="0" y="18" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="20">lyft</text>
  </svg>
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
    const params = new URLSearchParams({
      action: 'setPickup',
      pickup: 'my_location',
    });
    let url = `https://m.uber.com/ul/?${params.toString()}&dropoff[latitude]=${eventLat}&dropoff[longitude]=${eventLng}`;
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

  const baseClass =
    'flex-1 h-14 rounded-xl flex items-center justify-center gap-2.5 px-4 ' +
    'bg-white/55 dark:bg-black/45 backdrop-blur-xl ' +
    'border border-white/40 dark:border-white/10 ' +
    'shadow-[0_4px_16px_rgba(0,0,0,0.08)] ' +
    'hover:border-primary/40 hover:shadow-[0_0_0_1px_hsl(22_90%_52%/0.25),0_8px_24px_hsl(22_90%_52%/0.18)] ' +
    'active:scale-[0.97] transition-all duration-200 ease-out ' +
    'text-foreground';

  return (
    <div className="flex gap-3 w-full">
      <button
        type="button"
        onClick={() => handleClick('uber')}
        className={baseClass}
        aria-label="Open Uber with destination pre-filled"
      >
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-foreground text-background">
          <UberWordmark />
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="font-montserrat font-semibold text-sm">Uber</span>
          <span className="text-[10px] text-muted-foreground">Open app</span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => handleClick('lyft')}
        className={baseClass}
        aria-label="Open Lyft with destination pre-filled"
      >
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-foreground text-background">
          <LyftWordmark />
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="font-montserrat font-semibold text-sm">Lyft</span>
          <span className="text-[10px] text-muted-foreground">Open app</span>
        </span>
      </button>
    </div>
  );
}
