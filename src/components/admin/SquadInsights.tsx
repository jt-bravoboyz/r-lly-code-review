import { Users, Clock } from 'lucide-react';
import { BentoCard } from './BentoCard';

interface SquadInsightsProps {
  avgSquadSize: number;
  peakActivity: { label: string } | null;
}

export function SquadInsights({ avgSquadSize, peakActivity }: SquadInsightsProps) {
  return (
    <>
      <BentoCard span={6}>
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Avg Squad Size
          </span>
        </div>
        {avgSquadSize > 0 ? (
          <>
            <p className="text-3xl font-bold font-montserrat tabular-nums tracking-tight">
              {avgSquadSize.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">attendees per R@lly</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No R@lly data yet</p>
        )}
      </BentoCard>

      <BentoCard span={6}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Prime Engagement Window
          </span>
        </div>
        {peakActivity ? (
          <>
            <p className="text-2xl font-bold font-montserrat tabular-nums tracking-tight">
              {peakActivity.label}
            </p>
            <p className="text-xs text-muted-foreground mt-1">60-min window before peak R@lly start</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No activity data yet</p>
        )}
      </BentoCard>
    </>
  );
}
