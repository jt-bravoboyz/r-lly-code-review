import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { PointLedgerEntry } from '@/hooks/useBadgeSystem';

interface PointsHistoryListProps {
  entries: PointLedgerEntry[];
  className?: string;
}

// Human-readable descriptions for event types
const EVENT_TYPE_LABELS: Record<string, string> = {
  join_event: 'Joined a R@lly',
  drive_event: 'Drove for a R@lly',
  create_event: 'Created a R@lly',
  invite_friend: 'Recruit joined',
  join_squad: 'Joined a squad',
  create_squad: 'Created a squad',
  safe_arrival: 'Arrived home safely',
  reverse_join_event: 'Left event before start',
  reverse_drive_event: 'Ride not completed',
  reverse_create_event: 'Event canceled',
  reverse_invite_friend: 'Invite invalidated',
  reverse_join_squad: 'Left squad',
  reverse_create_squad: 'Squad deleted',
};

export function PointsHistoryList({ entries, className }: PointsHistoryListProps) {
  if (entries.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground text-sm', className)}>
        No points earned yet. Start joining R@llys!
      </div>
    );
  }

  // Group entries by date
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = entry.created_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, PointLedgerEntry[]>);

  return (
    <div className={cn('space-y-4', className)}>
      {Object.entries(groupedEntries).map(([date, dayEntries]) => (
        <div key={date}>
          <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
            {formatDateHeader(date)}
          </div>
          <div className="space-y-1">
            {dayEntries.map((entry) => (
              <div 
                key={entry.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50"
              >
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  entry.points > 0 
                    ? 'bg-primary/15 text-primary' 
                    : 'bg-destructive/15 text-destructive'
                )}>
                  {entry.points > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {EVENT_TYPE_LABELS[entry.event_type] || entry.event_type}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </div>
                </div>
                
                <div className={cn(
                  'text-sm font-bold',
                  entry.points > 0 ? 'text-primary' : 'text-destructive'
                )}>
                  {entry.points > 0 ? '+' : ''}{entry.points}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) {
    return 'Today';
  }
  if (dateStr === yesterday.toISOString().split('T')[0]) {
    return 'Yesterday';
  }
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}
