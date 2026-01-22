import { cn } from '@/lib/utils';
import { Award, Lock } from 'lucide-react';
import type { BadgeTier } from '@/hooks/useBadgeSystem';

// Tier-specific SVG icons
const TIER_ICONS: Record<string, string> = {
  bronze: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L4 7V12C4 16.5 7.5 20.5 12 22C16.5 20.5 20 16.5 20 12V7L12 2Z" fill="currentColor"/>
    <path d="M12 7L13 10H16L13.5 12L14.5 15L12 13L9.5 15L10.5 12L8 10H11L12 7Z" fill="white" opacity="0.9"/>
  </svg>`,
  silver: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L4 7V12C4 16.5 7.5 20.5 12 22C16.5 20.5 20 16.5 20 12V7L12 2Z" fill="currentColor"/>
    <path d="M9 8L12 6L15 8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 7L13.2 10.5H17L13.9 12.7L15 16L12 13.8L9 16L10.1 12.7L7 10.5H10.8L12 7Z" fill="white" opacity="0.9"/>
  </svg>`,
  gold: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L4 7V12C4 16.5 7.5 20.5 12 22C16.5 20.5 20 16.5 20 12V7L12 2Z" fill="currentColor"/>
    <path d="M8 5L10 7H14L16 5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 6L13.5 10H18L14.25 12.5L15.75 17L12 14L8.25 17L9.75 12.5L6 10H10.5L12 6Z" fill="white" opacity="0.95"/>
    <circle cx="12" cy="5" r="1.5" fill="white"/>
  </svg>`,
  emerald: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L6 5L4 12L6 19L12 22L18 19L20 12L18 5L12 2Z" fill="currentColor"/>
    <path d="M12 5L8 8L6 12L8 16L12 19L16 16L18 12L16 8L12 5Z" stroke="white" stroke-width="1" opacity="0.7"/>
    <path d="M12 8L10 10L9 12L10 14L12 16L14 14L15 12L14 10L12 8Z" fill="white" opacity="0.9"/>
  </svg>`,
  sapphire: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L5 7L3 12L5 17L12 22L19 17L21 12L19 7L12 2Z" fill="currentColor"/>
    <path d="M12 4L7 8L5 12L7 16L12 20L17 16L19 12L17 8L12 4Z" stroke="white" stroke-width="0.75" opacity="0.5"/>
    <path d="M12 7L9 10L8 12L9 14L12 17L15 14L16 12L15 10L12 7Z" fill="white" opacity="0.85"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
  </svg>`,
  ruby: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L6 6L4 12L6 18L12 22L18 18L20 12L18 6L12 2Z" fill="currentColor"/>
    <path d="M12 5L8 8L6 12L8 16L12 19L16 16L18 12L16 8L12 5Z" stroke="white" stroke-width="0.5" opacity="0.6"/>
    <path d="M12 8L10 10L9 12L10 14L12 16L14 14L15 12L14 10L12 8Z" fill="white" opacity="0.9"/>
    <path d="M10 6L12 4L14 6" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.8"/>
  </svg>`,
  amethyst: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1L8 4L6 8L4 12L6 16L8 20L12 23L16 20L18 16L20 12L18 8L16 4L12 1Z" fill="currentColor"/>
    <path d="M12 4L9 6L7 10L9 14L12 16L15 14L17 10L15 6L12 4Z" stroke="white" stroke-width="0.5" opacity="0.5"/>
    <path d="M12 7L10 9L9 12L10 15L12 17L14 15L15 12L14 9L12 7Z" fill="white" opacity="0.85"/>
    <path d="M10 5L12 3L14 5M8 8L12 5L16 8" stroke="white" stroke-width="0.75" opacity="0.7"/>
  </svg>`,
  diamond: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L4 8L12 22L20 8L12 2Z" fill="currentColor"/>
    <path d="M12 2L6 8L12 18L18 8L12 2Z" stroke="white" stroke-width="0.5" opacity="0.4"/>
    <path d="M4 8H20" stroke="white" stroke-width="0.75" opacity="0.6"/>
    <path d="M12 2L8 8L12 18L16 8L12 2Z" fill="white" opacity="0.3"/>
    <path d="M12 2V8M8 8L12 18M16 8L12 18" stroke="white" stroke-width="0.5" opacity="0.5"/>
  </svg>`,
  pink_diamond: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L4 8L12 22L20 8L12 2Z" fill="currentColor"/>
    <path d="M12 2L6 8L12 18L18 8L12 2Z" stroke="white" stroke-width="0.5" opacity="0.5"/>
    <path d="M4 8H20" stroke="white" stroke-width="1" opacity="0.7"/>
    <path d="M12 2L9 8L12 16L15 8L12 2Z" fill="white" opacity="0.4"/>
    <path d="M10 5L12 3L14 5" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.8"/>
    <circle cx="12" cy="10" r="1.5" fill="white" opacity="0.9"/>
  </svg>`,
  galaxy_opal: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="12" rx="10" ry="8" fill="currentColor"/>
    <ellipse cx="12" cy="12" rx="7" ry="5" stroke="white" stroke-width="0.5" opacity="0.4"/>
    <ellipse cx="12" cy="12" rx="4" ry="3" fill="white" opacity="0.3"/>
    <circle cx="10" cy="10" r="1.5" fill="white" opacity="0.8"/>
    <circle cx="14" cy="11" r="1" fill="white" opacity="0.6"/>
    <circle cx="11" cy="13" r="0.75" fill="white" opacity="0.7"/>
    <path d="M6 8C8 6 10 5 12 5C14 5 16 6 18 8" stroke="white" stroke-width="0.5" opacity="0.5"/>
  </svg>`,
  dark_matter: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
    <circle cx="12" cy="12" r="7" stroke="url(#dm-gradient)" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="black"/>
    <circle cx="12" cy="12" r="2" fill="url(#dm-core)"/>
    <path d="M5 12C5 8 8 5 12 5" stroke="#FF6B35" stroke-width="1" opacity="0.8"/>
    <path d="M19 12C19 16 16 19 12 19" stroke="#9966CC" stroke-width="1" opacity="0.8"/>
    <defs>
      <linearGradient id="dm-gradient" x1="5" y1="5" x2="19" y2="19">
        <stop offset="0%" stop-color="#FF6B35"/>
        <stop offset="50%" stop-color="#9966CC"/>
        <stop offset="100%" stop-color="#0F52BA"/>
      </linearGradient>
      <radialGradient id="dm-core" cx="50%" cy="50%">
        <stop offset="0%" stop-color="#FF6B35"/>
        <stop offset="100%" stop-color="#9966CC"/>
      </radialGradient>
    </defs>
  </svg>`,
};

interface TierBadgeIconProps {
  tier: BadgeTier | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  locked?: boolean;
  className?: string;
  showGlow?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export function TierBadgeIcon({ 
  tier, 
  size = 'md', 
  locked = false, 
  className,
  showGlow = false 
}: TierBadgeIconProps) {
  if (!tier) {
    return (
      <div className={cn(
        sizeClasses[size],
        'flex items-center justify-center rounded-full bg-muted',
        className
      )}>
        <Award className="w-1/2 h-1/2 text-muted-foreground" />
      </div>
    );
  }

  const iconSvg = TIER_ICONS[tier.tier_key];

  if (locked) {
    return (
      <div className={cn(
        sizeClasses[size],
        'relative flex items-center justify-center rounded-full bg-muted/50',
        className
      )}>
        {iconSvg ? (
          <div 
            className="w-full h-full opacity-30 grayscale"
            style={{ color: tier.accent_color || 'currentColor' }}
            dangerouslySetInnerHTML={{ __html: iconSvg }}
          />
        ) : (
          <Award className="w-1/2 h-1/2 text-muted-foreground/50" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="w-1/3 h-1/3 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        sizeClasses[size],
        'relative flex items-center justify-center',
        showGlow && 'drop-shadow-lg',
        className
      )}
      style={showGlow ? { 
        filter: `drop-shadow(0 0 10px ${tier.accent_color}40)` 
      } : undefined}
    >
      {iconSvg ? (
        <div 
          className="w-full h-full"
          style={{ color: tier.accent_color || 'currentColor' }}
          dangerouslySetInnerHTML={{ __html: iconSvg }}
        />
      ) : (
        <Award 
          className="w-full h-full" 
          style={{ color: tier.accent_color || 'currentColor' }}
        />
      )}
    </div>
  );
}
