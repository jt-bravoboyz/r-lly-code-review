import { cn } from '@/lib/utils';
import { Award, Check, Crown, Car, Shield, Megaphone, Star, Tag } from 'lucide-react';
import DOMPurify from 'dompurify';

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

// Fallback Lucide icons by badge_key
const FALLBACK_ICONS: Record<string, React.ElementType> = {
  rally_commander: Crown,
  convoy_captain: Car,
  active_duty: Shield,
  enlistment_officer: Megaphone,
  squad_commander: Star,
  enlisted: Tag,
};

export function ActivityBadgeIcon({ 
  badge, 
  progress,
  size = 'md', 
  className,
  showProgress = true
}: ActivityBadgeIconProps) {
  const isEarned = progress?.isEarned ?? false;
  const progressPercent = progress 
    ? Math.min(100, (progress.current / progress.required) * 100) 
    : 0;

  const renderIcon = () => {
    // Try to use SVG from database
    if (badge.icon_svg) {
      const sanitizedSvg = DOMPurify.sanitize(badge.icon_svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
      });
      
      return (
        <div 
          className={cn(iconSizeClasses[size], 'flex items-center justify-center')}
          style={{ color: isEarned ? 'hsl(var(--primary))' : 'currentColor' }}
          dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
        />
      );
    }

    // Fallback to Lucide icon
    const FallbackIcon = FALLBACK_ICONS[badge.badge_key] || Award;
    return (
      <FallbackIcon 
        className={cn(
          iconSizeClasses[size],
          isEarned ? 'text-primary' : 'text-muted-foreground'
        )} 
      />
    );
  };

  // Calculate stroke-dasharray for progress ring
  const radius = size === 'sm' ? 18 : size === 'md' ? 26 : 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {/* Progress ring (only when not earned and showProgress is true) */}
      {showProgress && !isEarned && progress && (
        <svg 
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox={`0 0 ${(radius + 4) * 2} ${(radius + 4) * 2}`}
        >
          {/* Background circle */}
          <circle
            cx={radius + 4}
            cy={radius + 4}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted"
          />
          {/* Progress circle */}
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

      {/* Badge background */}
      <div 
        className={cn(
          'absolute inset-1 rounded-full flex items-center justify-center',
          isEarned 
            ? 'bg-primary/15 border-2 border-primary/30' 
            : 'bg-muted border-2 border-border'
        )}
      >
        {renderIcon()}
      </div>

      {/* Earned checkmark */}
      {isEarned && (
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
