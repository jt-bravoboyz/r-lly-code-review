import { format } from 'date-fns';
import { getFlyerTheme, fitFlyerTitle, type FlyerThemeKey } from '@/lib/flyerThemes';
import { useFlyerAttendees } from '@/hooks/useFlyerAttendees';
import { cn } from '@/lib/utils';

export interface ThemedFlyerCanvasProps {
  eventId?: string | null;
  themeKey: FlyerThemeKey | string | null | undefined;
  customImageUrl?: string | null;
  title: string;
  startTime: string | Date | null;
  locationName?: string | null;
  dressCode?: string | null;
  /** 'preview' = 3:4 in-app card · 'share' = 1.91:1 OG render */
  aspect?: 'preview' | 'share';
  className?: string;
}

/**
 * In-app Themed Flyer renderer. Mirrors the JSX tree that the
 * `render-event-og-image` Satori function produces — keep these in sync.
 */
export function ThemedFlyerCanvas({
  eventId,
  themeKey,
  customImageUrl,
  title,
  startTime,
  locationName,
  dressCode,
  aspect = 'preview',
  className,
}: ThemedFlyerCanvasProps) {
  const theme = getFlyerTheme(themeKey);
  const { data: attendeeData } = useFlyerAttendees(eventId);
  const hostName = attendeeData?.hostName ?? null;
  const attendees = attendeeData?.attendees ?? [];
  const goingCount = attendeeData?.total ?? 0;

  const dt = startTime ? (startTime instanceof Date ? startTime : new Date(startTime)) : null;
  const dateLabel = dt ? format(dt, "EEE, MMM d · h:mm a") : 'Date TBD';

  const titleLines = fitFlyerTitle(title, 2, aspect === 'share' ? 18 : 20);
  const bgImage = customImageUrl || theme.bg;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl text-center',
        aspect === 'preview' ? 'aspect-[3/4]' : 'aspect-[1200/630]',
        className,
      )}
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: theme.frameGlow,
      }}
    >
      {/* Theme tint scrim */}
      <div className="absolute inset-0" style={{ background: theme.archTint }} />

      {/* Frosted arch container */}
      <div className="absolute inset-0 flex flex-col items-center justify-between p-6 md:p-8">
        {/* Top: host + RSVP pill */}
        <div className="flex w-full items-center justify-between gap-2">
          <span
            className="rounded-full px-3 py-1 text-[10px] font-montserrat uppercase tracking-[0.18em] backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.18)', color: theme.metaColor }}
          >
            {hostName ? `Hosted by ${hostName}` : 'R@lly'}
          </span>
          <span
            className="rounded-full px-3 py-1 text-[10px] font-montserrat uppercase tracking-[0.18em] backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.18)', color: theme.metaColor }}
          >
            You&apos;re invited
          </span>
        </div>

        {/* Center frosted arch */}
        <div
          className="relative mx-auto flex w-full max-w-[88%] flex-col items-center gap-3 rounded-[28px] px-5 py-6 backdrop-blur-xl"
          style={{
            background: 'rgba(255,255,255,0.15)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 20px 60px -20px rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.22)',
          }}
        >
          <div
            className="text-[10px] font-montserrat uppercase tracking-[0.28em]"
            style={{ color: theme.metaColor, opacity: 0.85 }}
          >
            {dateLabel}
          </div>
          <h1
            className="font-bold leading-[1.02]"
            style={{
              fontFamily: `'${theme.headingFont}', serif`,
              fontSize: aspect === 'share' ? '64px' : '40px',
              backgroundImage: theme.titleGradient,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: theme.titleColor,
            }}
          >
            {titleLines.map((l, i) => (
              <span key={i} style={{ display: 'block' }}>{l}</span>
            ))}
          </h1>
          {locationName && (
            <div
              className="text-xs font-montserrat tracking-wide"
              style={{ color: theme.metaColor }}
            >
              {locationName}
            </div>
          )}
          {dressCode && (
            <div
              className="mt-1 rounded-full px-3 py-1 text-[10px] font-montserrat uppercase tracking-[0.2em]"
              style={{ background: 'rgba(0,0,0,0.28)', color: theme.metaColor }}
            >
              Dress · {dressCode}
            </div>
          )}
        </div>

        {/* Bottom: social proof + palette */}
        <div className="flex w-full items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {attendees.length > 0 ? attendees.map(a => (
                <div
                  key={a.id}
                  className="h-7 w-7 rounded-full border-2 bg-cover bg-center"
                  style={{
                    borderColor: 'rgba(255,255,255,0.6)',
                    backgroundImage: a.avatar_url ? `url(${a.avatar_url})` : undefined,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                  }}
                />
              )) : (
                <div
                  className="h-7 w-7 rounded-full border-2"
                  style={{ borderColor: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.2)' }}
                />
              )}
            </div>
            <span
              className="text-[10px] font-montserrat uppercase tracking-[0.18em]"
              style={{ color: theme.metaColor }}
            >
              {goingCount > 0 ? `${goingCount} rallying` : 'Be the first in'}
            </span>
          </div>
          <div className="flex gap-1.5">
            {theme.palette.map((c, i) => (
              <span
                key={i}
                className="h-3 w-3 rounded-full"
                style={{ background: c, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
