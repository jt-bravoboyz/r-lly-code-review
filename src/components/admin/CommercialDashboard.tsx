import { DollarSign, Car, MapPin, Ticket, Clock } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';
import { LiveNowBadge } from './RallyPulse';

interface CommercialDashboardProps {
  totalGMV: number;
  paidEventsCount: number;
  providerSplit: Record<string, number>;
  eventsByCity: { city: string; count: number }[];
  avgDwellTime: number | null;
  revenuePotential?: number;
  avgTicket?: number;
  livePaidNowCount?: number;
}

export function CommercialDashboard({
  totalGMV,
  paidEventsCount,
  providerSplit,
  eventsByCity,
  avgDwellTime,
  revenuePotential,
  avgTicket,
  livePaidNowCount = 0,
}: CommercialDashboardProps) {
  const hasProviderData = Object.values(providerSplit).some(v => v > 0);
  const totalProviderCount = Object.values(providerSplit).reduce((s, v) => s + v, 0);
  const potential = revenuePotential ?? totalGMV;
  const ticket = avgTicket ?? (paidEventsCount > 0 ? totalGMV / paidEventsCount : 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Hero — Revenue Potential */}
      <BentoCard variant="hero" span={12}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Revenue Potential
            </span>
          </div>
          {livePaidNowCount > 0 && <LiveNowBadge count={livePaidNowCount} />}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6">
            <div className="text-5xl sm:text-6xl font-bold font-montserrat tabular-nums tracking-tight">
              ${potential.toFixed(2)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Realized + currently live paid R@llies. Tracks ROI of every paid experience on the platform.
            </p>
          </div>
          <div className="md:col-span-6 grid grid-cols-2 gap-2">
            <RoiTile label="Realized" value={`$${totalGMV.toFixed(2)}`} />
            <RoiTile label="Avg Ticket" value={`$${ticket.toFixed(2)}`} />
            <RoiTile label="Paid R@llies" value={String(paidEventsCount)} />
            <RoiTile label="Avg Dwell" value={avgDwellTime !== null ? `${avgDwellTime.toFixed(0)}m` : '—'} />
          </div>
        </div>
      </BentoCard>

      {/* Transit Liquidity */}
      <BentoCard span={6}>
        <div className="flex items-center gap-2 mb-3">
          <Car className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Transit Liquidity
          </span>
        </div>
        {hasProviderData ? (
          <div className="space-y-2">
            {Object.entries(providerSplit)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([provider, count]) => {
                const pct = totalProviderCount > 0 ? (count / totalProviderCount * 100) : 0;
                const label = provider === 'public_transit' ? 'Public Transit' : provider.charAt(0).toUpperCase() + provider.slice(1);
                return (
                  <div key={provider} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium shrink-0 min-w-[80px]">{label}</span>
                    <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden border border-border/30">
                      <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{count}</span>
                  </div>
                );
              })}
          </div>
        ) : (
          <AdminEmptyState message="No rideshare data yet" />
        )}
      </BentoCard>

      {/* Market Penetration */}
      <BentoCard span={6}>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Market Penetration
          </span>
        </div>
        {eventsByCity.length > 0 ? (
          <div className="space-y-2">
            {(() => {
              const maxCount = Math.max(...eventsByCity.slice(0, 8).map(i => i.count), 1);
              return eventsByCity.slice(0, 8).map((item) => (
                <div key={item.city} className="flex items-center gap-3">
                  <span className="text-sm truncate flex-1">{item.city}</span>
                  <div className="w-20 sm:w-28 h-2 bg-muted/40 rounded-full overflow-hidden border border-border/30">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold tabular-nums w-6 text-right">{item.count}</span>
                </div>
              ));
            })()}
          </div>
        ) : (
          <AdminEmptyState message="No location data yet" />
        )}
      </BentoCard>
    </div>
  );
}

function RoiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/40 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold font-montserrat tabular-nums tracking-tight">{value}</div>
    </div>
  );
}
