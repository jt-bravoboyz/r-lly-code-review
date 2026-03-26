import { cn } from '@/lib/utils';
import { Award, Lock } from 'lucide-react';
import type { BadgeTier } from '@/hooks/useBadgeSystem';

// Tier color configs for glow & styling
const TIER_STYLES: Record<string, { glow: string; ring: string; core: string }> = {
  bronze:       { glow: '#B95B39', ring: '#FFA14F', core: '#99412F' },
  silver:       { glow: '#8890A6', ring: '#D7EDF0', core: '#6E7796' },
  gold:         { glow: '#FFC64F', ring: '#FFA02B', core: '#E06919' },
  emerald:      { glow: '#39F1B3', ring: '#E0FE60', core: '#03823C' },
  sapphire:     { glow: '#FF5522', ring: '#FFAB92', core: '#A84E33' },
  ruby:         { glow: '#F73F36', ring: '#FFECA1', core: '#F00300' },
  amethyst:     { glow: '#A35CCA', ring: '#E5CFFF', core: '#6941BF' },
  diamond:      { glow: '#70BBEF', ring: '#9CD7F2', core: '#57ADDD' },
  pink_diamond: { glow: '#EA4E7F', ring: '#FF94B3', core: '#DD2F61' },
  galaxy_opal:  { glow: '#836CD9', ring: '#86D8FC', core: '#B5B0F7' },
  dark_matter:  { glow: '#FF50B5', ring: '#865CB2', core: '#2B3894' },
};

// Each tier gets a unique emblem SVG — shields/crests with inner symbols
const TIER_EMBLEMS: Record<string, (colors: { glow: string; ring: string; core: string }) => string> = {
  bronze: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-bronze" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#B95B39"/>
        <stop offset="50%" stop-color="#99412F"/>
        <stop offset="100%" stop-color="#FFA14F"/>
      </linearGradient>
    </defs>
    <path d="M32 4L8 16V36C8 48 18 58 32 62C46 58 56 48 56 36V16L32 4Z" fill="url(#bg-bronze)"/>
    <path d="M32 10L14 19V35C14 44 21 53 32 56C43 53 50 44 50 35V19L32 10Z" fill="none" stroke="white" stroke-width="0.8" opacity="0.3"/>
    <path d="M32 18L35 26H43L36.5 31L39 39L32 34L25 39L27.5 31L21 26H29L32 18Z" fill="white" opacity="0.85"/>
  </svg>`,

  silver: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-silver" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#8890A6"/>
        <stop offset="40%" stop-color="#D7EDF0"/>
        <stop offset="70%" stop-color="#6E7796"/>
        <stop offset="100%" stop-color="#C4E2FF"/>
      </linearGradient>
    </defs>
    <path d="M32 4L8 16V36C8 48 18 58 32 62C46 58 56 48 56 36V16L32 4Z" fill="url(#bg-silver)"/>
    <path d="M32 10L14 19V35C14 44 21 53 32 56C43 53 50 44 50 35V19L32 10Z" fill="none" stroke="white" stroke-width="0.8" opacity="0.35"/>
    <path d="M24 16L32 12L40 16" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
    <path d="M32 18L35.5 27H45L37.5 32.5L40 41L32 35.5L24 41L26.5 32.5L19 27H28.5L32 18Z" fill="white" opacity="0.9"/>
  </svg>`,

  gold: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-gold" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#FFC64F"/>
        <stop offset="40%" stop-color="#E06919"/>
        <stop offset="70%" stop-color="#FFC640"/>
        <stop offset="100%" stop-color="#FFA02B"/>
      </linearGradient>
    </defs>
    <path d="M32 4L8 16V36C8 48 18 58 32 62C46 58 56 48 56 36V16L32 4Z" fill="url(#bg-gold)"/>
    <path d="M32 8L12 18V36C12 46 20 55 32 58C44 55 52 46 52 36V18L32 8Z" fill="none" stroke="white" stroke-width="1" opacity="0.25"/>
    <circle cx="32" cy="14" r="3" fill="white" opacity="0.8"/>
    <path d="M22 14L26 18H38L42 14" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M32 20L36 29H46L38 34.5L41 43L32 37L23 43L26 34.5L18 29H28L32 20Z" fill="white" opacity="0.9"/>
  </svg>`,

  emerald: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-emerald" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#39F1B3"/>
        <stop offset="50%" stop-color="#03823C"/>
        <stop offset="100%" stop-color="#E0FE60"/>
      </linearGradient>
    </defs>
    <path d="M32 3L16 12L8 32L16 52L32 61L48 52L56 32L48 12L32 3Z" fill="url(#bg-emerald)"/>
    <path d="M32 10L20 17L13 32L20 47L32 54L44 47L51 32L44 17L32 10Z" stroke="white" stroke-width="0.8" opacity="0.3"/>
    <path d="M32 18L24 24L20 32L24 40L32 46L40 40L44 32L40 24L32 18Z" fill="white" opacity="0.15"/>
    <path d="M32 24L28 28L26 32L28 36L32 40L36 36L38 32L36 28L32 24Z" fill="white" opacity="0.85"/>
  </svg>`,

  sapphire: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-sapphire" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#FF5522"/>
        <stop offset="50%" stop-color="#A84E33"/>
        <stop offset="100%" stop-color="#FFAB92"/>
      </linearGradient>
    </defs>
    <path d="M32 3L14 14L6 32L14 50L32 61L50 50L58 32L50 14L32 3Z" fill="url(#bg-sapphire)"/>
    <path d="M32 9L18 17L11 32L18 47L32 55L46 47L53 32L46 17L32 9Z" stroke="white" stroke-width="0.6" opacity="0.3"/>
    <path d="M32 18L24 24L20 32L24 40L32 46L40 40L44 32L40 24L32 18Z" fill="white" opacity="0.15"/>
    <path d="M32 24L28 28L26 32L28 36L32 40L36 36L38 32L36 28L32 24Z" fill="white" opacity="0.8"/>
    <circle cx="32" cy="32" r="4" fill="white" opacity="0.9"/>
  </svg>`,

  ruby: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-ruby" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#F73F36"/>
        <stop offset="40%" stop-color="#F00300"/>
        <stop offset="100%" stop-color="#FFECA1"/>
      </linearGradient>
    </defs>
    <path d="M32 3L14 14L6 32L14 50L32 61L50 50L58 32L50 14L32 3Z" fill="url(#bg-ruby)"/>
    <path d="M32 9L18 17L11 32L18 47L32 55L46 47L53 32L46 17L32 9Z" stroke="white" stroke-width="0.5" opacity="0.35"/>
    <path d="M26 14L32 9L38 14" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
    <path d="M32 18L24 24L20 32L24 40L32 46L40 40L44 32L40 24L32 18Z" fill="white" opacity="0.12"/>
    <path d="M32 24L28 28L26 32L28 36L32 40L36 36L38 32L36 28L32 24Z" fill="white" opacity="0.85"/>
  </svg>`,

  amethyst: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-amethyst" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#6941BF"/>
        <stop offset="50%" stop-color="#A35CCA"/>
        <stop offset="100%" stop-color="#E5CFFF"/>
      </linearGradient>
    </defs>
    <path d="M32 2L20 8L14 18L10 32L14 46L20 56L32 62L44 56L50 46L54 32L50 18L44 8L32 2Z" fill="url(#bg-amethyst)"/>
    <path d="M32 8L22 13L17 22L14 32L17 42L22 51L32 56L42 51L47 42L50 32L47 22L42 13L32 8Z" stroke="white" stroke-width="0.5" opacity="0.3"/>
    <path d="M26 12L32 8L38 12M22 18L32 12L42 18" stroke="white" stroke-width="0.75" opacity="0.4"/>
    <path d="M32 20L26 26L23 32L26 38L32 44L38 38L41 32L38 26L32 20Z" fill="white" opacity="0.12"/>
    <path d="M32 26L29 29L28 32L29 35L32 38L35 35L36 32L35 29L32 26Z" fill="white" opacity="0.85"/>
  </svg>`,

  diamond: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-diamond" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#57ADDD"/>
        <stop offset="50%" stop-color="#70BBEF"/>
        <stop offset="100%" stop-color="#9CD7F2"/>
      </linearGradient>
    </defs>
    <path d="M32 4L10 20L32 60L54 20L32 4Z" fill="url(#bg-diamond)"/>
    <path d="M10 20H54" stroke="white" stroke-width="1" opacity="0.5"/>
    <path d="M32 4L18 20L32 48L46 20L32 4Z" stroke="white" stroke-width="0.5" opacity="0.3"/>
    <path d="M32 4L22 20L32 48L42 20L32 4Z" fill="white" opacity="0.2"/>
    <path d="M32 4V20M22 20L32 48M42 20L32 48" stroke="white" stroke-width="0.5" opacity="0.4"/>
  </svg>`,

  pink_diamond: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-pinkd" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#EA4E7F"/>
        <stop offset="50%" stop-color="#DD2F61"/>
        <stop offset="100%" stop-color="#FF94B3"/>
      </linearGradient>
    </defs>
    <path d="M32 4L10 20L32 60L54 20L32 4Z" fill="url(#bg-pinkd)"/>
    <path d="M10 20H54" stroke="white" stroke-width="1.2" opacity="0.6"/>
    <path d="M32 4L18 20L32 46L46 20L32 4Z" fill="white" opacity="0.15"/>
    <path d="M26 10L32 6L38 10" stroke="white" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
    <circle cx="32" cy="26" r="3.5" fill="white" opacity="0.85"/>
    <path d="M32 4V20M20 20L32 46M44 20L32 46" stroke="white" stroke-width="0.6" opacity="0.4"/>
  </svg>`,

  galaxy_opal: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-opal" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stop-color="#836CD9"/>
        <stop offset="50%" stop-color="#86D8FC"/>
        <stop offset="100%" stop-color="#B5B0F7"/>
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="32" rx="28" ry="22" fill="url(#bg-opal)"/>
    <ellipse cx="32" cy="32" rx="20" ry="14" stroke="white" stroke-width="0.6" opacity="0.3"/>
    <ellipse cx="32" cy="32" rx="10" ry="7" fill="white" opacity="0.15"/>
    <circle cx="26" cy="28" r="3" fill="white" opacity="0.75"/>
    <circle cx="38" cy="30" r="2" fill="white" opacity="0.55"/>
    <circle cx="30" cy="36" r="1.5" fill="white" opacity="0.65"/>
    <path d="M14 22C20 16 26 13 32 13C38 13 44 16 50 22" stroke="white" stroke-width="0.6" opacity="0.4"/>
  </svg>`,

  dark_matter: (c) => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-dm" x1="8" y1="8" x2="56" y2="56">
        <stop offset="0%" stop-color="#19305C"/>
        <stop offset="30%" stop-color="#2B3894"/>
        <stop offset="60%" stop-color="#865CB2"/>
        <stop offset="100%" stop-color="#FF50B5"/>
      </linearGradient>
      <radialGradient id="core-dm" cx="50%" cy="50%">
        <stop offset="0%" stop-color="#FF50B5"/>
        <stop offset="100%" stop-color="#865CB2"/>
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#bg-dm)"/>
    <circle cx="32" cy="32" r="20" stroke="url(#core-dm)" stroke-width="1.5" opacity="0.6"/>
    <circle cx="32" cy="32" r="11" fill="#0a0a1a"/>
    <circle cx="32" cy="32" r="6" fill="url(#core-dm)"/>
    <path d="M12 32C12 20 20 12 32 12" stroke="#FF50B5" stroke-width="1.2" opacity="0.7"/>
    <path d="M52 32C52 44 44 52 32 52" stroke="#865CB2" stroke-width="1.2" opacity="0.7"/>
  </svg>`,
};

interface TierBadgeIconProps {
  tier: BadgeTier | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  locked?: boolean;
  className?: string;
  showGlow?: boolean;
  isCurrent?: boolean;
}

const sizePx = { sm: 36, md: 52, lg: 68, xl: 100 };
const sizeClasses = { sm: 'w-9 h-9', md: 'w-13 h-13', lg: 'w-[68px] h-[68px]', xl: 'w-[100px] h-[100px]' };

export function TierBadgeIcon({
  tier,
  size = 'md',
  locked = false,
  className,
  showGlow = false,
  isCurrent = false,
}: TierBadgeIconProps) {
  if (!tier) {
    return (
      <div className={cn(sizeClasses[size], 'flex items-center justify-center rounded-full bg-muted', className)}>
        <Award className="w-1/2 h-1/2 text-muted-foreground" />
      </div>
    );
  }

  const tierKey = tier.tier_key;
  const style = TIER_STYLES[tierKey] || TIER_STYLES.bronze;
  const getEmblem = TIER_EMBLEMS[tierKey] || TIER_EMBLEMS.bronze;
  const svgHtml = getEmblem(style);
  const px = sizePx[size];

  if (locked) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'relative flex items-center justify-center',
          className
        )}
      >
        {/* Faded emblem */}
        <div
          className="w-full h-full opacity-20 grayscale blur-[0.5px]"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="w-1/3 h-1/3 text-muted-foreground/60" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        'relative flex items-center justify-center group',
        /* Idle glow pulse */
        'animate-badge-breathe',
        /* Hover/focus lift */
        'transition-transform duration-300 hover:scale-105',
        className
      )}
      style={{
        '--badge-glow': style.glow,
        '--badge-ring': style.ring,
      } as React.CSSProperties}
    >
      {/* Outer glow ring — always visible, intensifies on current */}
      <div
        className={cn(
          'absolute inset-[-4px] rounded-full opacity-0',
          isCurrent ? 'animate-badge-ring-active' : 'animate-badge-ring-idle'
        )}
        style={{
          background: `radial-gradient(circle, ${style.glow}30 0%, transparent 70%)`,
        }}
      />

      {/* Shimmer sweep overlay */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
        style={{ mixBlendMode: 'overlay' }}
      >
        <div className="absolute inset-0 animate-badge-shimmer"
          style={{
            background: `linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)`,
            backgroundSize: '200% 100%',
          }}
        />
      </div>

      {/* Main emblem */}
      <div
        className={cn(
          'w-full h-full relative z-10 transition-all duration-300',
          'group-hover:drop-shadow-lg'
        )}
        style={{
          filter: showGlow || isCurrent
            ? `drop-shadow(0 0 ${isCurrent ? 8 : 5}px ${style.glow}60)`
            : undefined,
        }}
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />

      {/* Current tier active ring */}
      {isCurrent && (
        <div
          className="absolute inset-[-3px] rounded-full animate-badge-active-ring pointer-events-none z-0"
          style={{
            border: `1.5px solid ${style.glow}50`,
          }}
        />
      )}
    </div>
  );
}
