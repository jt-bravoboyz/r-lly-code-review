import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';
import { cn } from '@/lib/utils';

interface FunnelStep {
  step: string;
  total: number;
  uniqueUsers: number;
}

interface FunnelChartProps {
  funnel: FunnelStep[];
  modeSplit: { simpleMode: number; logisticsMode: number };
}

const STEP_LABELS: Record<string, string> = {
  event_viewed: 'Event Viewed',
  event_created: 'Event Created',
  event_joined: 'Event Joined',
  rally_started: 'Rally Started',
  rally_ended: 'Rally Ended',
  rally_completed: 'Rally Completed',
  safety_confirmed: 'Safety Confirmed',
  invite_link_copied: 'Invite Copied',
  rally_home_opened: 'R@lly Home Opened',
};

export function FunnelChart({ funnel, modeSplit }: FunnelChartProps) {
  const maxTotal = Math.max(...funnel.map(f => f.total), 1);

  return (
    <BentoCard span={12}>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Funnel Breakdown
        </span>
        <div className="flex items-center gap-1.5">
          <MetricPill tone="muted">
            <span className="tabular-nums">{modeSplit.simpleMode}</span> Simple
          </MetricPill>
          <MetricPill tone="muted">
            <span className="tabular-nums">{modeSplit.logisticsMode}</span> Logistics
          </MetricPill>
        </div>
      </div>

      <div className="space-y-3">
        {funnel.map((step, i) => {
          const prevTotal = i > 0 ? funnel[i - 1].total : step.total;
          const dropoff = prevTotal > 0 ? ((prevTotal - step.total) / prevTotal * 100) : 0;
          const widthPct = (step.total / maxTotal) * 100;

          return (
            <div key={step.step} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{STEP_LABELS[step.step] || step.step}</span>
                <span className="text-muted-foreground tabular-nums">
                  {step.total} total · {step.uniqueUsers} unique
                  {i > 0 && dropoff > 0 && (
                    <span className="text-red-500 ml-2">-{dropoff.toFixed(0)}%</span>
                  )}
                </span>
              </div>
              <div className="h-5 rounded-full bg-muted/40 overflow-hidden border border-border/30">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    'bg-gradient-to-r from-primary to-primary/70',
                  )}
                  style={{ width: `${Math.max(widthPct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </BentoCard>
  );
}
