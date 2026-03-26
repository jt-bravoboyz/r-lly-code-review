import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Repeat, Crown } from 'lucide-react';

interface GrowthMetricsProps {
  growth: {
    repeatRate: number;
    repeatUsers: number;
    totalUsers: number;
    topHosts: Array<{
      profileId: string;
      eventsCreated: number;
      avgAttendees: number;
      displayName: string;
      avatarUrl: string | null;
    }>;
  };
}

export function GrowthMetrics({ growth }: GrowthMetricsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Growth Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Crew recurrence */}
        <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
          <Repeat className="h-8 w-8 text-primary" />
          <div>
            <div className="text-2xl font-bold">{growth.repeatRate.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">
              Repeat users ({growth.repeatUsers} of {growth.totalUsers} attended 2+ events)
            </div>
          </div>
        </div>

        {/* Host power ranking */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            Top Hosts
          </h4>
          <div className="space-y-2">
            {growth.topHosts.length === 0 && (
              <p className="text-sm text-muted-foreground">No host data yet</p>
            )}
            {growth.topHosts.map((host, i) => (
              <div key={host.profileId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={host.avatarUrl || undefined} />
                  <AvatarFallback>{host.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{host.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    {host.eventsCreated} events · avg {host.avgAttendees} attendees
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
