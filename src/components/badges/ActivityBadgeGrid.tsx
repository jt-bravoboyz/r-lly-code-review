import { cn } from '@/lib/utils';
import { ActivityBadgeIcon } from './ActivityBadgeIcon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ActivityBadge {
  badge_key: string;
  badge_name: string;
  description: string;
  icon_svg?: string | null;
  icon_path?: string | null;
  requirement_count: number;
  progress_count: number;
  earned_at: string | null;
  isEarned: boolean;
  current_tier_level: number;
  currentTierName: string;
  currentTierColor: string;
  nextTierThreshold: number;
  nextTierName: string | null;
  nextTierColor: string | null;
}

interface ActivityBadgeGridProps {
  badges: ActivityBadge[];
  className?: string;
}

export function ActivityBadgeGrid({ badges, className }: ActivityBadgeGridProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('grid grid-cols-3 gap-4', className)}>
        {badges.filter(b => b.badge_key !== 'founder_25').map((badge) => {
          const tierLevel = badge.current_tier_level || 0;
          const isMaxTier = tierLevel >= 5;

          // Status text
          let statusText: string;
          if (isMaxTier) {
            statusText = 'Dark Matter ✦';
          } else if (tierLevel >= 1 && badge.nextTierName) {
            statusText = `${badge.progress_count}/${badge.nextTierThreshold} to ${badge.nextTierName}`;
          } else if (tierLevel >= 1) {
            statusText = `${badge.currentTierName} Rank`;
          } else {
            statusText = `${badge.progress_count}/${badge.requirement_count}`;
          }

          // Tier label
          const tierLabel = tierLevel >= 1 ? `${badge.currentTierName} Rank` : null;

          const isFounder = badge.badge_key === 'founder_25';

          return (
            <Tooltip key={badge.badge_key}>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    'flex flex-col items-center text-center p-3 rounded-xl transition-all cursor-pointer',
                    badge.isEarned 
                      ? 'hover:scale-[1.03]' 
                      : 'bg-muted/50 hover:bg-muted',
                    isFounder && badge.isEarned && 'ring-1 ring-[#F47A19]/40'
                  )}
                  style={badge.isEarned ? {
                    backgroundColor: isFounder ? '#F47A190F' : `${badge.currentTierColor}0D`,
                    border: `1px solid ${isFounder ? '#F47A1966' : badge.currentTierColor + '33'}`,
                    ...(isFounder ? { boxShadow: '0 0 12px 2px #F47A1933' } : {}),
                  } : undefined}
                >
                  <ActivityBadgeIcon
                    badge={badge}
                    progress={{
                      current: badge.progress_count,
                      required: isMaxTier ? badge.nextTierThreshold : badge.nextTierThreshold,
                      isEarned: badge.isEarned,
                    }}
                    tierLevel={tierLevel}
                    size="md"
                    showProgress
                  />
                  
                  <span className={cn(
                    'mt-2 text-xs font-semibold leading-tight font-montserrat',
                    badge.isEarned ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {badge.badge_name}
                  </span>

                  {tierLabel && (
                    <span 
                      className="text-[10px] font-bold mt-0.5 font-montserrat"
                      style={{ color: badge.currentTierColor }}
                    >
                      {tierLabel}
                    </span>
                  )}
                  
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {statusText}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="max-w-[200px] text-center"
              >
                <p className="font-semibold text-sm font-montserrat">{badge.badge_name}</p>
                <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                {tierLevel >= 1 && (
                  <p className="text-xs font-bold mt-1" style={{ color: badge.currentTierColor }}>
                    {badge.currentTierName} Rank
                  </p>
                )}
                {!isMaxTier && badge.nextTierName && (
                  <p className="text-xs mt-1 font-medium" style={{ color: badge.nextTierColor || undefined }}>
                    {badge.progress_count}/{badge.nextTierThreshold} to {badge.nextTierName}
                  </p>
                )}
                {isMaxTier && (
                  <p className="text-xs mt-1 font-medium text-primary">
                    MAX RANK achieved ✦
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
