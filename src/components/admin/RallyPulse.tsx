import { Calendar, UserCheck, Users, ShieldCheck, ChevronRight } from 'lucide-react';
import { BentoCard } from './BentoCard';
import { cn } from '@/lib/utils';

interface RallyPulseProps {
  created: number;
  /** Committed Users — total event_attendees rows (every join) */
  committed: number;
  /** Verified Foot Traffic — attendees with status === 'attending' */
  verified: number;
  conversionRate: number;
  /** Already capped at 100 in useAdminData */
  safetyRate: number;
  liveNowCount: number;
}

interface Step {
  label: string;
  value: string;
  caption?: string;
  icon: React.ElementType;
}

/**
 * Hamilton-rule pulse bar: replaces 6 stat cards with a single horizontal flow.
 * Created → Committed Users → Verified Foot Traffic → Safe.
 */
export function RallyPulse({
  created,
  committed,
  verified,
  conversionRate,
  safetyRate,
  liveNowCount,
}: RallyPulseProps) {
  const steps: Step[] = [
    {
      label: 'Created',
      value: String(created),
      caption: 'R@llies launched',
      icon: Calendar,
    },
    {
      label: 'Committed Users',
      value: String(committed),
      caption: `${conversionRate.toFixed(0)}% conversion`,
      icon: Users,
    },
    {
      label: 'Verified Foot Traffic',
      value: String(verified),
      caption: 'on-the-ground attendees',
      icon: UserCheck,
    },
    {
      label: 'Safe',
      value: `${safetyRate.toFixed(0)}%`,
      caption: 'confirmed home',
      icon: ShieldCheck,
    },
  ];

  return (
    <BentoCard span={12}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            R@lly Pulse
          </span>
        </div>
        {liveNowCount > 0 && <LiveNowBadge count={liveNowCount} />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-stretch sm:gap-2">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex items-stretch sm:flex-1">
            <PulseStep step={step} />
            {idx < steps.length - 1 && (
              <div className="hidden sm:flex items-center px-1 text-muted-foreground/40">
                <ChevronRight className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

function PulseStep({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <div className="flex-1 rounded-2xl border border-border/40 bg-background/40 p-4 transition-colors hover:bg-background/70">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {step.label}
      </div>
      <div className="mt-2 text-2xl sm:text-3xl font-bold font-montserrat tabular-nums tracking-tight">
        {step.value}
      </div>
      {step.caption && (
        <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
          {step.caption}
        </div>
      )}
    </div>
  );
}

export function LiveNowBadge({ count }: { count: number }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider tabular-nums">
        Live Now · {count} active
      </span>
    </div>
  );
}
