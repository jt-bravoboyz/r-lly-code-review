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
}

interface ActivityBadgeGridProps {
  badges: ActivityBadge[];
  className?: string;
}

export function ActivityBadgeGrid({ badges, className }: ActivityBadgeGridProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('grid grid-cols-3 gap-4', className)}>
        {badges.map((badge) => (
          <Tooltip key={badge.badge_key}>
            <TooltipTrigger asChild>
              <div 
                className={cn(
                  'flex flex-col items-center text-center p-3 rounded-xl transition-all cursor-pointer',
                  badge.isEarned 
                    ? 'bg-primary/5 border border-primary/20 hover:bg-primary/10' 
                    : 'bg-muted/50 hover:bg-muted'
                )}
              >
                <ActivityBadgeIcon
                  badge={badge}
                  progress={{
                    current: badge.progress_count,
                    required: badge.requirement_count,
                    isEarned: badge.isEarned,
                  }}
                  size="md"
                  showProgress
                />
                
                <span className={cn(
                  'mt-2 text-xs font-semibold leading-tight',
                  badge.isEarned ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {badge.badge_name}
                </span>
                
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {badge.isEarned ? (
                    'Earned!'
                  ) : (
                    `${badge.progress_count}/${badge.requirement_count}`
                  )}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              className="max-w-[200px] text-center"
            >
              <p className="font-semibold text-sm">{badge.badge_name}</p>
              <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
              {!badge.isEarned && (
                <p className="text-xs text-primary mt-1 font-medium">
                  {badge.progress_count}/{badge.requirement_count} to unlock
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
