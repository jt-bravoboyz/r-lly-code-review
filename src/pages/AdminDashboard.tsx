import { useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminAnalytics } from '@/hooks/useAdminData';
import { AnalyticsCards } from '@/components/admin/AnalyticsCards';
import { RetentionMetrics } from '@/components/admin/RetentionMetrics';
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
import { KFactorCard } from '@/components/admin/KFactorCard';
import { SquadInsights } from '@/components/admin/SquadInsights';
import { SafetyROI } from '@/components/admin/SafetyROI';
import { AdminDateFilter, type DatePreset } from '@/components/admin/AdminDateFilter';
import { AdminCSVExport } from '@/components/admin/AdminCSVExport';
import { SystemFeedbackCard } from '@/components/admin/SystemFeedbackCard';
import { TopConnectors } from '@/components/admin/TopConnectors';
import { Shield, Loader2, Home } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type ViewMode = 'partner' | 'technical' | 'commercial';

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('partner');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const { data, isLoading } = useAdminAnalytics(viewMode === 'partner' || viewMode === 'commercial', datePreset);

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center gap-3 py-4">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold font-montserrat">R@lly Admin</h1>

          <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors min-h-[44px]">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Return to App</span>
          </Link>

          {/* View mode toggle */}
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
        {/* Date filter */}
        <div className="container pb-3 flex items-center gap-3">
          <AdminDateFilter value={datePreset} onChange={setDatePreset} />
        </div>
      </header>

      <main className="container py-6 space-y-6 pb-12">
        {isLoading || !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : viewMode === 'partner' ? (
          <>
            {/* 1. K-Factor — first thing visible */}
            <KFactorCard
              kFactor={data.summary.kFactor}
              inviteCopied={data.summary.inviteCopied}
              totalEvents={data.summary.totalEventsCreated}
            />

            {/* 2. Analytics Cards */}
            <AnalyticsCards summary={data.summary} sparkline={data.sparkline} />

            {/* 3. Retention */}
            <RetentionMetrics retention={data.retention as any} />

            {/* 4. Squad Insights + Safety ROI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="grid grid-cols-2 gap-4">
                <SquadInsights avgSquadSize={data.avgSquadSize} peakActivity={data.peakActivity} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SafetyROI safeDepartures={data.safeDepartures} transitLatencyMinutes={data.transitLatency} />
              </div>
            </div>

            {/* 5. Growth + Safety */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GrowthMetrics growth={data.growth} />
              <SafetyMetrics safety={data.safety} attendees={data.attendees} />
            </div>

            {/* 6. Founder + Feedback */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FounderPanel
                founders={data.founders}
                attendees={data.attendees}
                rallyEvents={data.rallyEvents}
                referralCounts={data.referralCounts}
              />
              <FeedbackPanel feedback={data.feedback} profiles={data.profiles} />
            </div>

            {/* Top Connectors */}
            <TopConnectors topConnectors={data.topConnectors} />

            {/* 7. System Feedback */}
            <SystemFeedbackCard />

            {/* 7. CSV Export */}
            <div className="flex justify-end">
              <AdminCSVExport
                events={data.rallyEvents}
                attendees={data.attendees}
                label="Export Partner Report"
              />
            </div>
          </>
        ) : viewMode === 'commercial' ? (
          <>
            <CommercialDashboard
              totalGMV={data.commercial?.totalGMV ?? 0}
              paidEventsCount={data.commercial?.paidEventsCount ?? 0}
              providerSplit={data.transit?.providerSplit ?? {}}
              eventsByCity={data.commercial?.eventsByCity ?? []}
              avgDwellTime={data.avgDwellTime}
            />
            <div className="flex justify-end">
              <AdminCSVExport
                events={data.rallyEvents}
                attendees={data.attendees}
                label="Export Commercial Report"
              />
            </div>
          </>
        ) : (
          <>
            {/* Technical View */}
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
