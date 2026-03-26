import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
};

export function FunnelChart({ funnel, modeSplit }: FunnelChartProps) {
  const maxTotal = Math.max(...funnel.map(f => f.total), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Funnel Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funnel bars */}
        <div className="space-y-3">
          {funnel.map((step, i) => {
            const prevTotal = i > 0 ? funnel[i - 1].total : step.total;
            const dropoff = prevTotal > 0 ? ((prevTotal - step.total) / prevTotal * 100) : 0;
            const widthPct = (step.total / maxTotal) * 100;

            return (
              <div key={step.step} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{STEP_LABELS[step.step] || step.step}</span>
                  <span className="text-muted-foreground">
                    {step.total} total · {step.uniqueUsers} unique
                    {i > 0 && dropoff > 0 && (
                      <span className="text-destructive ml-2">-{dropoff.toFixed(0)}%</span>
                    )}
                  </span>
                </div>
                <div className="h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.max(widthPct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Mode split */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-2">Mode Split</h4>
          <div className="flex gap-4 text-sm">
            <div className="flex-1 p-3 bg-muted rounded-lg text-center">
              <div className="text-xl font-bold">{modeSplit.simpleMode}</div>
              <div className="text-muted-foreground">Simple Mode</div>
            </div>
            <div className="flex-1 p-3 bg-muted rounded-lg text-center">
              <div className="text-xl font-bold">{modeSplit.logisticsMode}</div>
              <div className="text-muted-foreground">Logistics Mode</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
