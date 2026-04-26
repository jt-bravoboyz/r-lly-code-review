import { Repeat } from 'lucide-react';
import { BentoCard } from './BentoCard';
import { InfoTip } from './InfoTip';

interface GrowthMetricsProps {
  growth: {
    repeatRate: number;
    repeatUsers: number;
    totalUsers: number;
    topHosts: Array<{
      profileId: string;
      eventsCreated: number;
      avgAttendees: number;
      displayName: string;
      avatarUrl: string | null;
    }>;
  };
}

/**
 * Hamilton: top hosts now live exclusively in GrowthNarrative.
 * This card keeps only the repeat-user signal.
 */
export function GrowthMetrics({ growth }: GrowthMetricsProps) {
  return (
    <BentoCard span={12}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Crew Recurrence
        </span>
        <InfoTip text="What % of users came back for a second R@lly. The single best signal that the product is sticky." />
      </div>
      <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-background/40 p-4">
        <Repeat className="h-8 w-8 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-3xl font-bold font-montserrat tabular-nums tracking-tight">
            {growth.repeatRate.toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {growth.repeatUsers} of {growth.totalUsers} attended 2+ R@llies
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
