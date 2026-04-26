import { Repeat } from 'lucide-react';
import { BentoCard } from './BentoCard';
import { InfoTip } from './InfoTip';
import { cn } from '@/lib/utils';

interface Cohort {
  weekStart: string;
  weekLabel: string;
  cohortSize: number;
  returnRates: (number | null)[]; // [%week+1, %week+2, %week+3]
}

interface RetentionCohortsProps {
  cohorts: Cohort[];
  span?: 6 | 12;
}

/**
 * 4-week retention cohort strip. Each row = a week's joiners; bars show what %
 * came back in subsequent weeks. The most recent week shows fewer bars (no future data).
 */
export function RetentionCohorts({ cohorts, span = 6 }: RetentionCohortsProps) {
  return (
    <BentoCard span={span}>
      <div className="flex items-center gap-2 mb-3">
        <Repeat className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Retention Cohorts</h3>
        <InfoTip text="Of users who joined a R@lly in a given week, this shows the % who came back to another R@lly in the following weeks. Higher bars = stickier app. The most recent weeks haven't had time to retain yet." />
      </div>

      <div className="space-y-2">
        {cohorts.length === 0 || cohorts.every(c => c.cohortSize === 0) ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Cohort data will appear once users start joining R@llies.
          </p>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-[80px_36px_1fr_1fr_1fr] items-center gap-2 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>Week of</span>
              <span className="text-right">Size</span>
              <span className="text-center">+1 wk</span>
              <span className="text-center">+2 wk</span>
              <span className="text-center">+3 wk</span>
            </div>
            {cohorts.map(cohort => (
              <div
                key={cohort.weekStart}
                className="grid grid-cols-[80px_36px_1fr_1fr_1fr] items-center gap-2 rounded-xl border border-border/30 bg-background/40 px-2 py-2"
              >
                <span className="text-xs font-medium tabular-nums">{cohort.weekLabel}</span>
                <span className="text-xs text-muted-foreground text-right tabular-nums">{cohort.cohortSize}</span>
                {cohort.returnRates.map((rate, i) => (
                  <CohortBar key={i} rate={rate} disabled={cohort.cohortSize === 0} />
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </BentoCard>
  );
}

function CohortBar({ rate, disabled }: { rate: number | null; disabled: boolean }) {
  if (disabled || rate === null) {
    return (
      <div className="relative h-5 rounded-full bg-muted/40 overflow-hidden">
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/60">
          —
        </span>
      </div>
    );
  }
  return (
    <div className="relative h-5 rounded-full bg-muted/40 overflow-hidden">
      <div
        className={cn(
          'absolute inset-y-0 left-0 rounded-full transition-all',
          rate >= 50 ? 'bg-primary' : rate >= 25 ? 'bg-primary/70' : 'bg-primary/40'
        )}
        style={{ width: `${Math.min(100, Math.max(4, rate))}%` }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums mix-blend-difference text-white">
        {rate.toFixed(0)}%
      </span>
    </div>
  );
}
