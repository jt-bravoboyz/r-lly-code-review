import { Card, CardContent } from '@/components/ui/card';
import { Users, Activity, Calendar, TrendingUp } from 'lucide-react';
import { InfoTip } from './InfoTip';

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
  { key: 'totalUsers' as const, label: 'Total Users', icon: Users, color: 'text-blue-400', tip: 'Every account that has ever signed up for R@lly.' },
  { key: 'dau' as const, label: 'DAU (24h)', icon: Activity, color: 'text-green-400', tip: 'Daily Active Users — people who opened the app in the last 24 hours.' },
  { key: 'wau' as const, label: 'WAU (7d)', icon: Activity, color: 'text-emerald-400', tip: 'Weekly Active Users — people who opened the app in the last 7 days.' },
  { key: 'mau' as const, label: 'MAU (30d)', icon: Calendar, color: 'text-cyan-400', tip: 'Monthly Active Users — people who opened the app in the last 30 days. The headline number for app health.' },
  { key: 'threeMonth' as const, label: '3-Month', icon: TrendingUp, color: 'text-purple-400', tip: 'Users active at any point in the last 3 months.' },
  { key: 'sixMonth' as const, label: '6-Month', icon: TrendingUp, color: 'text-indigo-400', tip: 'Users active at any point in the last 6 months.' },
  { key: 'yearly' as const, label: 'Yearly', icon: TrendingUp, color: 'text-orange-400', tip: 'Users active at any point in the last 12 months.' },
];

export function RetentionMetrics({ retention }: RetentionMetricsProps) {
  const pct = (count: number) =>
    retention.totalUsers === 0 ? '0%' : `${Math.round((count / retention.totalUsers) * 100)}%`;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Growth & Retention
        </h3>
        <InfoTip text="How many real people are coming back to the app over different time windows. The bigger these numbers and the higher the % of total users, the healthier the product." />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {metricCards.map(({ key, label, icon: Icon, color, tip }) => (
          <Card key={key} className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardContent className="p-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-2 ${color}`} />
              <div className="text-2xl font-bold tabular-nums">{retention[key]}</div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                <span>{label}</span>
                <InfoTip text={tip} className="h-4 w-4" />
              </div>
              {key !== 'totalUsers' && (
                <div className="text-xs text-muted-foreground/70 mt-0.5 tabular-nums">
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
