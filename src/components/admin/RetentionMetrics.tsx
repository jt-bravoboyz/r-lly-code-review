import { Card, CardContent } from '@/components/ui/card';
import { Users, Activity, Calendar, TrendingUp } from 'lucide-react';

interface RetentionData {
  totalUsers: number;
  dau: number;
  wau: number;
  mau: number;
  threeMonth: number;
  sixMonth: number;
  yearly: number;
}

interface RetentionMetricsProps {
  retention: RetentionData;
}

const metricCards = [
  { key: 'totalUsers' as const, label: 'Total Users', icon: Users, color: 'text-blue-400' },
  { key: 'dau' as const, label: 'DAU (24h)', icon: Activity, color: 'text-green-400' },
  { key: 'wau' as const, label: 'WAU (7d)', icon: Activity, color: 'text-emerald-400' },
  { key: 'mau' as const, label: 'MAU (30d)', icon: Calendar, color: 'text-cyan-400' },
  { key: 'threeMonth' as const, label: '3-Month', icon: TrendingUp, color: 'text-purple-400' },
  { key: 'sixMonth' as const, label: '6-Month', icon: TrendingUp, color: 'text-indigo-400' },
  { key: 'yearly' as const, label: 'Yearly', icon: TrendingUp, color: 'text-orange-400' },
];

export function RetentionMetrics({ retention }: RetentionMetricsProps) {
  const pct = (count: number) =>
    retention.totalUsers === 0 ? '0%' : `${Math.round((count / retention.totalUsers) * 100)}%`;

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        Growth & Retention
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {metricCards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardContent className="p-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-2 ${color}`} />
              <div className="text-2xl font-bold">{retention[key]}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
              {key !== 'totalUsers' && (
                <div className="text-xs text-muted-foreground/70 mt-0.5">
                  {pct(retention[key])}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
