import { useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminAnalytics } from '@/hooks/useAdminData';
import { AnalyticsCards } from '@/components/admin/AnalyticsCards';
import { FunnelChart } from '@/components/admin/FunnelChart';
import { SafetyMetrics } from '@/components/admin/SafetyMetrics';
import { GrowthMetrics } from '@/components/admin/GrowthMetrics';
import { FounderPanel } from '@/components/admin/FounderPanel';
import { FeedbackPanel } from '@/components/admin/FeedbackPanel';
import { UserIntelligence } from '@/components/admin/UserIntelligence';
import { LiveActivityFeed } from '@/components/admin/LiveActivityFeed';
import { FeatureFlags } from '@/components/admin/FeatureFlags';
import { ErrorLogFeed } from '@/components/admin/ErrorLogFeed';
import { OnboardingDropoff } from '@/components/admin/OnboardingDropoff';
import { CommercialDashboard } from '@/components/admin/CommercialDashboard';
import { Shield, Loader2, Home } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type ViewMode = 'partner' | 'technical' | 'commercial';

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('partner');
  const { data, isLoading } = useAdminAnalytics(viewMode === 'partner');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center gap-3 py-4">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold font-montserrat">R@lly Admin</h1>

          {/* Partner / Technical toggle */}
          <div className="ml-auto flex items-center gap-1 bg-muted rounded-full p-0.5">
            {(['partner', 'technical', 'commercial'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full transition-all capitalize',
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6 pb-12">
        {isLoading || !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : viewMode === 'partner' ? (
          <>
            {/* Partner View: Clean success metrics */}
            <AnalyticsCards summary={data.summary} sparkline={data.sparkline} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GrowthMetrics growth={data.growth} />
              <SafetyMetrics safety={data.safety} attendees={data.attendees} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FounderPanel
                founders={data.founders}
                attendees={data.attendees}
                rallyEvents={data.rallyEvents}
              />
              <FeedbackPanel feedback={data.feedback} profiles={data.profiles} />
            </div>
          </>
        ) : viewMode === 'commercial' ? (
          <CommercialDashboard
            totalGMV={data.commercial?.totalGMV ?? 0}
            paidEventsCount={data.commercial?.paidEventsCount ?? 0}
            providerSplit={data.transit?.providerSplit ?? {}}
            eventsByCity={data.commercial?.eventsByCity ?? []}
          />
        ) : (
          <>
            {/* Technical View: System health */}
            <AnalyticsCards summary={data.summary} sparkline={data.sparkline} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FunnelChart funnel={data.funnel} modeSplit={data.modeSplit} />
              <OnboardingDropoff />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UserIntelligence
                profiles={data.profiles}
                attendees={data.attendees}
                rallyEvents={data.rallyEvents}
              />
              <ErrorLogFeed />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LiveActivityFeed />
              <FeatureFlags />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
