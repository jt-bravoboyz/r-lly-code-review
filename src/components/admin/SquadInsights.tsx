import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock } from 'lucide-react';
import { AdminEmptyState } from './AdminEmptyState';

interface SquadInsightsProps {
  avgSquadSize: number;
  peakActivity: { label: string } | null;
}

export function SquadInsights({ avgSquadSize, peakActivity }: SquadInsightsProps) {
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Average Squad Size
          </CardTitle>
        </CardHeader>
        <CardContent>
          {avgSquadSize > 0 ? (
            <>
              <p className="text-3xl font-bold font-montserrat">{avgSquadSize.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">attendees per rally</p>
            </>
          ) : (
            <AdminEmptyState message="No rally data yet" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Prime Brand Engagement Window
          </CardTitle>
        </CardHeader>
        <CardContent>
          {peakActivity ? (
            <>
              <p className="text-2xl font-bold font-montserrat">{peakActivity.label}</p>
              <p className="text-xs text-muted-foreground mt-1">60-min window before peak rally starts</p>
            </>
          ) : (
            <AdminEmptyState message="No activity data yet" />
          )}
        </CardContent>
      </Card>
    </>
  );
}
