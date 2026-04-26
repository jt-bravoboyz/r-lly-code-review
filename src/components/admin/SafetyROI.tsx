import { ShieldCheck, Timer } from 'lucide-react';
import { BentoCard } from './BentoCard';

interface SafetyROIProps {
  safeDepartures: number;
  transitLatencyMinutes: number | null;
}

export function SafetyROI({ safeDepartures, transitLatencyMinutes }: SafetyROIProps) {
  return (
    <>
      <BentoCard span={6}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Safe Departures
          </span>
        </div>
        <p className="text-3xl font-bold font-montserrat tabular-nums tracking-tight">{safeDepartures}</p>
        <p className="text-xs text-muted-foreground mt-1">used rideshare or transit to leave</p>
      </BentoCard>

      <BentoCard span={6}>
        <div className="flex items-center gap-2 mb-2">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Transit Latency
          </span>
        </div>
        {transitLatencyMinutes !== null ? (
          <>
            <p className="text-3xl font-bold font-montserrat tabular-nums tracking-tight">
              {transitLatencyMinutes.toFixed(0)} min
            </p>
            <p className="text-xs text-muted-foreground mt-1">avg time from R@lly end → home screen</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No data yet</p>
        )}
      </BentoCard>
    </>
  );
}
