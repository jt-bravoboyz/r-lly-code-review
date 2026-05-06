import { ReactNode, MouseEvent, KeyboardEvent } from 'react';
import { usePublicProfile } from '@/contexts/PublicProfileContext';
import { cn } from '@/lib/utils';

interface ProfileTapWrapperProps {
  profileId: string | null | undefined;
  children: ReactNode;
  className?: string;
  /** Stop click propagation (useful when wrapped row also has onClick) */
  stopPropagation?: boolean;
  /** Render as inline span instead of block button */
  inline?: boolean;
  ariaLabel?: string;
}

/**
 * Tappable wrapper that opens the global Public Profile Quick View sheet.
 * Use around any name/avatar surface to enable "tap to preview profile".
 */
export function ProfileTapWrapper({
  profileId,
  children,
  className,
  stopPropagation = true,
  inline = false,
  ariaLabel,
}: ProfileTapWrapperProps) {
  const { openProfile } = usePublicProfile();

  if (!profileId) {
    return <>{children}</>;
  }

  const handleClick = (e: MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    e.preventDefault();
    openProfile(profileId);
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (stopPropagation) e.stopPropagation();
      openProfile(profileId);
    }
  };

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKey}
      aria-label={ariaLabel || 'View profile'}
      className={cn(
        'cursor-pointer outline-none rounded-md transition hover:opacity-80 active:opacity-70 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/60',
        inline ? 'inline-flex items-center' : 'inline-block',
        className,
      )}
    >
      {children}
    </span>
  );
}
