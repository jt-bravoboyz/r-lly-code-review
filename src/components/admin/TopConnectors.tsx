import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus } from 'lucide-react';
import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';
import { cn } from '@/lib/utils';

interface TopConnectorsProps {
  topConnectors: Array<{
    profileId: string;
    referralCount: number;
    displayName: string;
    avatarUrl: string | null;
  }>;
}

export function TopConnectors({ topConnectors }: TopConnectorsProps) {
  return (
    <BentoCard span={12}>
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Top Connectors
        </span>
      </div>
      {topConnectors.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No referral signups yet. Share invite links to start tracking.
        </p>
      ) : (
        <div className="space-y-2">
          {topConnectors.map((c, i) => (
            <div
              key={c.profileId}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-background/40 hover:bg-background/70 transition-colors"
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                  i === 0 && 'bg-primary text-primary-foreground',
                  i === 1 && 'bg-primary/30 text-primary',
                  i === 2 && 'bg-primary/15 text-primary',
                  i >= 3 && 'bg-muted text-muted-foreground',
                )}
              >
                {i + 1}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={c.avatarUrl || undefined} />
                <AvatarFallback>{c.displayName?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{c.displayName}</span>
              </div>
              <MetricPill tone="accent">
                <span className="tabular-nums">{c.referralCount}</span>
              </MetricPill>
            </div>
          ))}
        </div>
      )}
    </BentoCard>
  );
}
