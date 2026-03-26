import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, ShieldCheck, Link2, Calendar } from 'lucide-react';

interface SparklineData {
  day: string;
  created: number;
  joined: number;
}

interface AnalyticsCardsProps {
  summary: {
    totalEventsCreated: number;
    recentEvents: number;
    totalJoined: number;
    conversionRate: number;
    completionRate: number;
    safetyRate: number;
    inviteCopied: number;
  };
  sparkline: SparklineData[];
}

function MiniSparkline({ data, dataKey }: { data: SparklineData[]; dataKey: 'created' | 'joined' }) {
  const values = data.map(d => d[dataKey]);
  const max = Math.max(...values, 1);
  const width = 80;
  const height = 24;

  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${height - (v / max) * height}`)
    .join(' ');

  return (
    <svg width={width} height={height} className="text-primary">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  sparkline,
  sparklineKey,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  sparkline?: SparklineData[];
  sparklineKey?: 'created' | 'joined';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {sparkline && sparklineKey && (
            <MiniSparkline data={sparkline} dataKey={sparklineKey} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsCards({ summary, sparkline }: AnalyticsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      <StatCard
        title="Events Created"
        value={summary.totalEventsCreated}
        subtitle={`${summary.recentEvents} last 7 days`}
        icon={Calendar}
        sparkline={sparkline}
        sparklineKey="created"
      />
      <StatCard
        title="Events Joined"
        value={summary.totalJoined}
        subtitle={`${summary.conversionRate.toFixed(1)}% conversion`}
        icon={Users}
        sparkline={sparkline}
        sparklineKey="joined"
      />
      <StatCard
        title="Rally Completion"
        value={`${summary.completionRate.toFixed(0)}%`}
        subtitle="reaching completed"
        icon={TrendingUp}
      />
      <StatCard
        title="Safety Rate"
        value={`${summary.safetyRate.toFixed(0)}%`}
        subtitle="confirmed safe"
        icon={ShieldCheck}
      />
      <StatCard
        title="Invite Copies"
        value={summary.inviteCopied}
        subtitle="links copied"
        icon={Link2}
      />
    </div>
  );
}
