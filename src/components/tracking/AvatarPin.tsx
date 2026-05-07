import { cn } from '@/lib/utils';

interface AvatarPinProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  isCurrentUser?: boolean;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function AvatarPin({ avatarUrl, displayName, isCurrentUser }: AvatarPinProps) {
  const size = isCurrentUser ? 1.2 : 1;
  const width = 40 * size;
  const height = 52 * size;
  const avatarSize = 30 * size;

  return (
    <div
      className="relative"
      style={{
        width,
        height,
        transformOrigin: 'bottom center',
        filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.25))',
      }}
    >
      {/* Breathing glow halo for current user — sits behind teardrop */}
      {isCurrentUser && (
        <div
          className="absolute rounded-full animate-pin-breath pointer-events-none"
          style={{
            top: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: width * 0.95,
            height: width * 0.95,
          }}
        />
      )}

      {/* Teardrop SVG */}
      <svg
        viewBox="0 0 40 52"
        width={width}
        height={height}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <path
          d="M20 1 C9.5 1 1 9.5 1 20 C1 31 11 38 20 51 C29 38 39 31 39 20 C39 9.5 30.5 1 20 1 Z"
          className={cn(
            'fill-white/85 dark:fill-white/15 stroke-black/20 dark:stroke-white/50',
          )}
          strokeWidth={1}
          style={{ backdropFilter: 'blur(6px)' }}
        />
      </svg>

      {/* Avatar circle inside teardrop top */}
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center font-bold text-white"
        style={{
          width: avatarSize,
          height: avatarSize,
          top: 5 * size,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#F47A19',
          fontSize: 12 * size,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <span>{getInitials(displayName)}</span>
        )}
      </div>
    </div>
  );
}
