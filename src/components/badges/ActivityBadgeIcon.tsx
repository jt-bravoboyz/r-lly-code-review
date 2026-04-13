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

  const renderIcon = () => {
    if (badge.icon_svg) {
      const sanitizedSvg = DOMPurify.sanitize(badge.icon_svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
      });
      
      return (
        <div 
          className={cn(iconSizeClasses[size], 'flex items-center justify-center')}
          style={{ color: isEarned ? tierColor : 'currentColor' }}
          dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
        />
      );
    }

    const FallbackIcon = FALLBACK_ICONS[badge.badge_key] || Award;
    return (
      <FallbackIcon 
        className={cn(iconSizeClasses[size])}
        style={{ color: isEarned ? tierColor : undefined }}
      />
    );
  };

  const radius = size === 'sm' ? 18 : size === 'md' ? 26 : 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Glow styles for Silver+ tiers
  const glowStyle: React.CSSProperties = {};
  if (tierLevel >= 2 && tierLevel < 5) {
    glowStyle.boxShadow = `0 0 8px 2px ${tierColor}66`;
  }

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

      {/* Earned checkmark with tier color */}
      {isEarned && (
        <div 
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
          style={{ backgroundColor: tierColor }}
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
