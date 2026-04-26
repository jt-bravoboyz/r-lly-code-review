import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Car, UserCheck } from 'lucide-react';
import { BentoCard } from './BentoCard';

interface SafetyMetricsProps {
  safety: {
    afterRallyRate: number;
    avgDD: number;
    ddCount: number;
    safetyConfirmed: number;
    goingHome: number;
  };
  attendees: Array<{
    arrived_safely: boolean | null;
    is_dd: boolean | null;
    going_home_at: string | null;
    not_participating_rally_home_confirmed: boolean | null;
  }>;
}

export function SafetyMetrics({ safety, attendees }: SafetyMetricsProps) {
  const rallyGotMe = attendees.filter(a => a.going_home_at && !a.not_participating_rally_home_confirmed).length;
  const doingMyself = attendees.filter(a => a.not_participating_rally_home_confirmed).length;
  const totalDecided = rallyGotMe + doingMyself;
  const rallyGotMeRate = totalDecided > 0 ? (rallyGotMe / totalDecided * 100) : 0;
  const doingMyselfRate = totalDecided > 0 ? (doingMyself / totalDecided * 100) : 0;

  // Hamilton: After R@lly Rate is already implied by RallyPulse safety segment — don't echo it here.
  const metrics = [
    { label: 'Avg DDs / Event', value: safety.avgDD.toFixed(1), icon: Car, desc: `${safety.ddCount} total DDs` },
    { label: 'R@lly Got Me', value: `${rallyGotMeRate.toFixed(0)}%`, icon: ShieldCheck, desc: `${rallyGotMe} users` },
    { label: 'Doing It Myself', value: `${doingMyselfRate.toFixed(0)}%`, icon: UserCheck, desc: `${doingMyself} users` },
  ];

  return (
    <BentoCard span={12}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Safety Pulse
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {metrics.map(m => (
          <div
            key={m.label}
            className="rounded-2xl border border-border/40 bg-background/40 p-4 transition-colors hover:bg-background/70"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <m.icon className="h-3 w-3" />
              {m.label}
            </div>
            <div className="mt-1.5 text-2xl sm:text-3xl font-bold font-montserrat tabular-nums tracking-tight">
              {m.value}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">{m.desc}</div>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}
