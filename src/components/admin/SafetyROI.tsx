import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Timer } from 'lucide-react';

interface SafetyROIProps {
  safeDepartures: number;
  transitLatencyMinutes: number | null;
}

export function SafetyROI({ safeDepartures, transitLatencyMinutes }: SafetyROIProps) {
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Estimated Safe Departures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold font-montserrat">{safeDepartures}</p>
          <p className="text-xs text-muted-foreground mt-1">used rideshare or transit to leave</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Transit Latency
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transitLatencyMinutes !== null ? (
            <>
              <p className="text-3xl font-bold font-montserrat">{transitLatencyMinutes.toFixed(0)} min</p>
              <p className="text-xs text-muted-foreground mt-1">avg time from rally end → home screen</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No data yet</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
