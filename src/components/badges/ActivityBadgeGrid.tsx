import { cn } from '@/lib/utils';
import { ActivityBadgeIcon } from './ActivityBadgeIcon';

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
    <div className={cn('grid grid-cols-3 gap-4', className)}>
      {badges.map((badge) => (
        <div 
          key={badge.badge_key}
          className={cn(
            'flex flex-col items-center text-center p-3 rounded-xl transition-all',
            badge.isEarned 
              ? 'bg-primary/5 border border-primary/20' 
              : 'bg-muted/50'
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
      ))}
    </div>
  );
}
