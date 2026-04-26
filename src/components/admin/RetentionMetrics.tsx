import { Users, Activity, Calendar, TrendingUp } from 'lucide-react';
import { BentoCard } from './BentoCard';
import { InfoTip } from './InfoTip';
import { cn } from '@/lib/utils';

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
  { key: 'totalUsers' as const, label: 'Total', icon: Users, tip: 'Every account that has ever signed up for R@lly.' },
  { key: 'dau' as const, label: 'DAU', icon: Activity, tip: 'Daily Active Users — opened the app in the last 24 hours.' },
  { key: 'wau' as const, label: 'WAU', icon: Activity, tip: 'Weekly Active Users — opened the app in the last 7 days.' },
  { key: 'mau' as const, label: 'MAU', icon: Calendar, tip: 'Monthly Active Users — the headline number for app health.' },
  { key: 'threeMonth' as const, label: '3-Mo', icon: TrendingUp, tip: 'Users active at any point in the last 3 months.' },
  { key: 'sixMonth' as const, label: '6-Mo', icon: TrendingUp, tip: 'Users active at any point in the last 6 months.' },
  { key: 'yearly' as const, label: '1-Yr', icon: TrendingUp, tip: 'Users active at any point in the last 12 months.' },
];

export function RetentionMetrics({ retention }: RetentionMetricsProps) {
  const pct = (count: number) =>
    retention.totalUsers === 0 ? '0%' : `${Math.round((count / retention.totalUsers) * 100)}%`;

  return (
    <BentoCard span={12}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Active Users
        </span>
        <InfoTip text="How many real people came back across each window. Higher % of total = healthier product." />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
        {metricCards.map(({ key, label, icon: Icon, tip }) => (
          <div
            key={key}
            className="rounded-2xl border border-border/40 bg-background/40 p-3 transition-colors hover:bg-background/70"
          >
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Icon className="h-3 w-3" />
              {label}
              <InfoTip text={tip} className="h-3.5 w-3.5 ml-auto" />
            </div>
            <div className={cn('mt-1.5 text-xl sm:text-2xl font-bold font-montserrat tabular-nums tracking-tight')}>
              {retention[key]}
            </div>
            {key !== 'totalUsers' && (
              <div className="text-[10px] text-muted-foreground tabular-nums">{pct(retention[key])}</div>
            )}
          </div>
        ))}
      </div>
    </BentoCard>
  );
}
