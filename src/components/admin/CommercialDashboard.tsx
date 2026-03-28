import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { DollarSign, Car, MapPin } from 'lucide-react';

interface CommercialDashboardProps {
  totalGMV: number;
  paidEventsCount: number;
  providerSplit: Record<string, number>;
  eventsByCity: { city: string; count: number }[];
  avgDwellTime: number | null;
}

export function CommercialDashboard({ totalGMV, paidEventsCount, providerSplit, eventsByCity, avgDwellTime }: CommercialDashboardProps) {
  const hasProviderData = Object.values(providerSplit).some(v => v > 0);
  const totalProviderCount = Object.values(providerSplit).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      {/* GMV Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue (GMV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-montserrat">${totalGMV.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{paidEventsCount} paid event{paidEventsCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Car className="h-4 w-4" />
              Rideshare Provider Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasProviderData ? (
              <div className="space-y-2">
                {Object.entries(providerSplit)
                  .filter(([, count]) => count > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([provider, count]) => {
                    const pct = totalProviderCount > 0 ? (count / totalProviderCount * 100) : 0;
                    const label = provider === 'public_transit' ? 'Public Transit' : provider.charAt(0).toUpperCase() + provider.slice(1);
                    return (
                      <div key={provider} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <AdminEmptyState message="No rideshare data yet" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Density by City */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Event Density by City
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsByCity.length > 0 ? (
            <div className="space-y-2">
              {eventsByCity.slice(0, 10).map((item) => (
                <div key={item.city} className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{item.city}</span>
                  <span className="text-sm font-bold ml-2">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState message="No location data yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
