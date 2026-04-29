import { cn } from '@/lib/utils';
import { Award, Check, Crown, Car, Shield, Megaphone, Star, Tag } from 'lucide-react';
import DOMPurify from 'dompurify';
import { getActivityTierInfo } from '@/hooks/useBadgeSystem';

interface ActivityBadgeIconProps {
  badge: {
    badge_key: string;
    badge_name: string;
    icon_svg?: string | null;
    icon_path?: string | null;
  };
  progress?: {
    current: number;
    required: number;
    isEarned: boolean;
  };
  tierLevel?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showProgress?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

const iconSizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-10 h-10',
};

const FALLBACK_ICONS: Record<string, React.ElementType> = {
  rally_commander: Crown,
  convoy_captain: Car,
  active_duty: Shield,
  enlistment_officer: Megaphone,
  squad_commander: Star,
  enlisted: Tag,
  founder_25: Crown,
};

// Military-medal metallic palettes for Bronze / Silver / Gold.
// Each one has: deep shadow, mid base, bright highlight, plus a hot specular for shimmer.
const MEDAL_PALETTES: Record<number, {
  shadow: string;
  base: string;
  highlight: string;
  specular: string;
  rimDark: string;
  rimLight: string;
}> = {
  1: {
    // Bronze
    shadow: '#5C2E10',
    base: '#A56A35',
    highlight: '#E8B07A',
    specular: '#FFE3C2',
    rimDark: '#3D1F0A',
    rimLight: '#F2C08A',
  },
  2: {
    // Silver
    shadow: '#5A6168',
    base: '#B8BEC4',
    highlight: '#F2F4F7',
    specular: '#FFFFFF',
    rimDark: '#2F3438',
    rimLight: '#FAFBFC',
  },
  3: {
    // Gold
    shadow: '#7A5300',
    base: '#E0A800',
    highlight: '#FFE680',
    specular: '#FFF8C2',
    rimDark: '#4A3200',
    rimLight: '#FFF1A8',
  },
};

export function ActivityBadgeIcon({ 
  badge, 
  progress,
  tierLevel = 0,
  size = 'md', 
  className,
  showProgress = true
}: ActivityBadgeIconProps) {
  const isEarned = progress?.isEarned ?? false;
  const tierInfo = getActivityTierInfo(tierLevel);
  const tierColor = tierInfo.color;
  const progressPercent = progress 
    ? Math.min(100, (progress.current / progress.required) * 100) 
    : 0;

  const isMedal = isEarned && (tierLevel === 1 || tierLevel === 2 || tierLevel === 3);
  const medal = isMedal ? MEDAL_PALETTES[tierLevel] : null;

  const renderIcon = () => {
    if (badge.icon_svg) {
      const sanitizedSvg = DOMPurify.sanitize(badge.icon_svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
      });
      
      return (
        <div 
          className={cn(iconSizeClasses[size], 'flex items-center justify-center relative z-10')}
          style={{
            color: isEarned ? (medal ? medal.shadow : tierColor) : 'currentColor',
            filter: isMedal
              ? 'drop-shadow(0 1px 0 rgba(255,255,255,0.55)) drop-shadow(0 -1px 0 rgba(0,0,0,0.45))'
              : undefined,
          }}
          dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
        />
      );
    }

    const FallbackIcon = FALLBACK_ICONS[badge.badge_key] || Award;
    return (
      <FallbackIcon 
        className={cn(iconSizeClasses[size], 'relative z-10')}
        style={{
          color: isEarned ? (medal ? medal.shadow : tierColor) : undefined,
          filter: isMedal
            ? 'drop-shadow(0 1px 0 rgba(255,255,255,0.55)) drop-shadow(0 -1px 0 rgba(0,0,0,0.45))'
            : undefined,
        }}
      />
    );
  };

  const radius = size === 'sm' ? 18 : size === 'md' ? 26 : 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Glow styles for non-medal earned tiers (Diamond etc.)
  const glowStyle: React.CSSProperties = {};
  if (tierLevel >= 4 && tierLevel < 5) {
    glowStyle.boxShadow = `0 0 8px 2px ${tierColor}66`;
  }

  // Unique IDs for shimmer keyframes (avoid collisions when many badges render)
  const uid = `${badge.badge_key}-${tierLevel}`;

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {/* Progress ring */}
      {showProgress && !isEarned && progress && (
        <svg 
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox={`0 0 ${(radius + 4) * 2} ${(radius + 4) * 2}`}
        >
          <circle
            cx={radius + 4}
            cy={radius + 4}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted"
          />
          <circle
            cx={radius + 4}
            cy={radius + 4}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-primary transition-all duration-500"
          />
        </svg>
      )}

      {/* Progress ring for earned badges progressing to next tier */}
      {showProgress && isEarned && progress && progressPercent < 100 && (
        <svg 
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox={`0 0 ${(radius + 4) * 2} ${(radius + 4) * 2}`}
        >
          <circle
            cx={radius + 4}
            cy={radius + 4}
            r={radius}
            fill="none"
            strokeWidth="3"
            style={{ stroke: `${tierColor}33` }}
          />
          <circle
            cx={radius + 4}
            cy={radius + 4}
            r={radius}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ stroke: tierColor }}
            className="transition-all duration-500"
          />
        </svg>
      )}

      {/* Badge background */}
      {isMedal && medal ? (
        <div
          className="absolute inset-1 rounded-full overflow-hidden"
          style={{
            // Outer rim: a conic-gradient simulates a lathed metal edge catching light around the circle.
            background: `conic-gradient(from 220deg, ${medal.rimDark}, ${medal.rimLight}, ${medal.base}, ${medal.rimDark}, ${medal.rimLight}, ${medal.rimDark})`,
            boxShadow: `
              0 1px 2px rgba(0,0,0,0.45),
              0 4px 10px rgba(0,0,0,0.25),
              inset 0 0 0 1px ${medal.rimLight}66
            `,
          }}
        >
          {/* Inner medal face: radial gradient for a struck-metal look */}
          <div
            className="absolute inset-[2px] rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: `radial-gradient(circle at 30% 25%, ${medal.highlight} 0%, ${medal.base} 45%, ${medal.shadow} 100%)`,
              boxShadow: `inset 0 1px 1px ${medal.specular}cc, inset 0 -2px 3px rgba(0,0,0,0.45)`,
            }}
          >
            {/* Sweeping shimmer band */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(115deg, transparent 35%, ${medal.specular}e6 48%, ${medal.specular}ff 50%, ${medal.specular}e6 52%, transparent 65%)`,
                mixBlendMode: 'screen',
                opacity: 0.85,
                animation: `medalShimmer-${uid} 3.6s ease-in-out infinite`,
                transform: 'translateX(-120%)',
              }}
            />
            {/* Top specular highlight (fixed, like light from above) */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(ellipse 70% 35% at 50% 12%, ${medal.specular}99 0%, transparent 70%)`,
                mixBlendMode: 'screen',
              }}
            />
            {renderIcon()}
          </div>

          <style>{`
            @keyframes medalShimmer-${uid} {
              0%   { transform: translateX(-120%); }
              55%  { transform: translateX(120%); }
              100% { transform: translateX(120%); }
            }
          `}</style>
        </div>
      ) : (
        <div
          className={cn(
            'absolute inset-1 rounded-full flex items-center justify-center',
            !isEarned && 'bg-muted border-2 border-border',
            tierLevel === 5 && 'dark-matter-glow'
          )}
          style={{
            ...(isEarned ? {
              backgroundColor: `${tierColor}22`,
              border: `2px solid ${tierColor}4D`,
              ...glowStyle,
            } : {}),
          }}
        >
          {renderIcon()}
        </div>
      )}

      {/* Earned checkmark with tier color */}
      {isEarned && (
        <div 
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm z-20"
          style={{
            backgroundColor: medal ? medal.base : tierColor,
            boxShadow: medal
              ? `0 1px 2px rgba(0,0,0,0.45), inset 0 1px 0 ${medal.specular}aa`
              : undefined,
          }}
        >
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Dark Matter keyframes */}
      {tierLevel === 5 && (
        <style>{`
          @keyframes darkMatterGlow {
            0%, 100% { box-shadow: 0 0 10px 3px #F47A1966; }
            25% { box-shadow: 0 0 10px 3px #FFD70066; }
            50% { box-shadow: 0 0 10px 3px #57ADDD66; }
            75% { box-shadow: 0 0 10px 3px #FF50B566; }
          }
          .dark-matter-glow {
            animation: darkMatterGlow 4s ease-in-out infinite;
          }
        `}</style>
      )}
    </div>
  );
}
