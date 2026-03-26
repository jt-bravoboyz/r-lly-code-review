import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Car, Home, UserCheck } from 'lucide-react';

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

  const metrics = [
    { label: 'After R@lly Rate', value: `${safety.afterRallyRate.toFixed(0)}%`, icon: Home, desc: '% events reaching After R@lly' },
    { label: 'Avg DDs per Event', value: safety.avgDD.toFixed(1), icon: Car, desc: `${safety.ddCount} total DDs` },
    { label: '"R@lly Got Me"', value: `${rallyGotMeRate.toFixed(0)}%`, icon: ShieldCheck, desc: `${rallyGotMe} users` },
    { label: '"Doing It Myself"', value: `${doingMyselfRate.toFixed(0)}%`, icon: UserCheck, desc: `${doingMyself} users` },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Safety Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(m => (
            <div key={m.label} className="p-4 bg-muted rounded-xl text-center space-y-1">
              <m.icon className="h-5 w-5 mx-auto text-primary" />
              <div className="text-2xl font-bold">{m.value}</div>
              <div className="text-xs font-medium">{m.label}</div>
              <div className="text-xs text-muted-foreground">{m.desc}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
