import { useState, useRef, useEffect } from 'react';
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
import { SquadAudit } from '@/components/admin/SquadAudit';
import { SafetyROI } from '@/components/admin/SafetyROI';
import { AdminDateFilter, type DatePreset } from '@/components/admin/AdminDateFilter';
import { AdminCSVExport } from '@/components/admin/AdminCSVExport';
import { SystemFeedbackCard } from '@/components/admin/SystemFeedbackCard';
import { TopConnectors } from '@/components/admin/TopConnectors';
import { ReferralAudit } from '@/components/admin/ReferralAudit';
import { UserDirectory } from '@/components/admin/UserDirectory';
import { GrowthNarrative } from '@/components/admin/GrowthNarrative';
import { HeatMap } from '@/components/admin/HeatMap';
import { RetentionCohorts } from '@/components/admin/RetentionCohorts';
import { BentoCard } from '@/components/admin/BentoCard';
import { Shield, Loader2, Home } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type ViewMode = 'partner' | 'technical' | 'commercial';
const VIEW_MODES: ViewMode[] = ['partner', 'technical', 'commercial'];

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('partner');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const { data, isLoading } = useAdminAnalytics(viewMode === 'partner' || viewMode === 'commercial', datePreset);

  // Sliding indicator for the segmented view-mode pill
  const toggleRefs = useRef<Record<ViewMode, HTMLButtonElement | null>>({
    partner: null, technical: null, commercial: null,
  });
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useEffect(() => {
    const el = toggleRefs.current[viewMode];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [viewMode]);

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
    <div
      className="min-h-[100dvh] bg-background"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 1200px 600px at 50% -10%, hsl(var(--primary) / 0.08), transparent 60%)',
      }}
    >
      {/* Apple-Pro glass header */}
      <header className="border-b border-border/40 bg-card/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex items-center gap-3 py-4">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold font-montserrat tracking-tight">R@lly Admin</h1>

          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors min-h-[44px]"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Return to App</span>
          </Link>

          {/* Segmented pill with sliding orange indicator */}
          <div className="ml-auto relative flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 p-1 backdrop-blur-sm">
            <div
              className="absolute top-1 bottom-1 rounded-full bg-primary shadow-sm transition-all duration-300 ease-out"
              style={{ left: indicator.left, width: indicator.width }}
              aria-hidden
            />
            {VIEW_MODES.map(mode => (
              <button
                key={mode}
                ref={el => (toggleRefs.current[mode] = el)}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'relative z-10 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors capitalize',
                  viewMode === mode ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="container pb-3 flex items-center gap-3">
          <AdminDateFilter value={datePreset} onChange={setDatePreset} />
        </div>
      </header>

      <main className="container py-6 pb-12">
        {isLoading || !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div key={viewMode} className="animate-fade-in">
            {viewMode === 'partner' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Data integrity banner */}
                {(data as any).adminFilterActive && (
                  <div className="md:col-span-12 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground backdrop-blur-sm">
                    <span className="font-semibold text-foreground">Data integrity:</span>{' '}
                    Growth metrics exclude {(data as any).adminAccountCount} internal team account
                    {(data as any).adminAccountCount === 1 ? '' : 's'} for clean partner reporting. Per-event
                    headcount, founder activity, and safety usage reflect every real attendee.
                  </div>
                )}

                {/* HERO — Growth Narrative */}
                <GrowthNarrative
                  kFactor={data.summary.kFactor}
                  totalRallies={data.summary.totalEventsCreated}
                  inviteCopied={data.summary.inviteCopied}
                  topViralHosts={(data as any).topViralHosts ?? []}
                  repeatRateThisWeek={(data as any).repeatRateThisWeek ?? 0}
                  repeatRateDelta={(data as any).repeatRateDelta ?? 0}
                />

                {/* K-Factor + Analytics row */}
                <BentoCard span={4}>
                  <KFactorCard
                    kFactor={data.summary.kFactor}
                    inviteCopied={data.summary.inviteCopied}
                    totalEvents={data.summary.totalEventsCreated}
                    embedded
                  />
                </BentoCard>
                <div className="md:col-span-8">
                  <AnalyticsCards summary={data.summary} sparkline={data.sparkline} />
                </div>

                {/* Spatial intelligence row */}
                <HeatMap eventLocations={(data as any).eventLocations ?? []} span={6} />
                <RetentionCohorts cohorts={(data as any).weeklyCohorts ?? []} span={6} />

                {/* Retention */}
                <div className="md:col-span-12">
                  <RetentionMetrics retention={data.retention as any} />
                </div>

                {/* Squad + Safety ROI */}
                <BentoCard span={6} contentClassName="p-0 sm:p-0">
                  <div className="p-1">
                    <SquadInsights avgSquadSize={data.avgSquadSize} peakActivity={data.peakActivity} />
                  </div>
                </BentoCard>
                <BentoCard span={6} contentClassName="p-0 sm:p-0">
                  <div className="p-1">
                    <SafetyROI safeDepartures={data.safeDepartures} transitLatencyMinutes={data.transitLatency} />
                  </div>
                </BentoCard>

                {/* Growth + Safety */}
                <div className="md:col-span-6">
                  <GrowthMetrics growth={data.growth} />
                </div>
                <div className="md:col-span-6">
                  <SafetyMetrics safety={data.safety} attendees={(data as any).attendeesRaw ?? data.attendees} />
                </div>

                {/* Founder + Feedback */}
                <div className="md:col-span-6">
                  <FounderPanel
                    founders={data.founders}
                    attendees={(data as any).attendeesRaw ?? data.attendees}
                    rallyEvents={(data as any).rallyEventsRaw ?? data.rallyEvents}
                    referralCounts={data.referralCounts}
                  />
                </div>
                <div className="md:col-span-6">
                  <FeedbackPanel feedback={data.feedback} profiles={data.profiles} />
                </div>

                {/* Top Connectors */}
                <div className="md:col-span-12">
                  <TopConnectors topConnectors={data.topConnectors} />
                </div>

                {/* User Directory */}
                <div className="md:col-span-12">
                  <UserDirectory users={(data as any).userDirectory ?? []} />
                </div>

                {/* Referral Audit */}
                <div className="md:col-span-12">
                  <ReferralAudit referralDetails={data.referralDetails} />
                </div>

                {/* System Feedback */}
                <div className="md:col-span-12">
                  <SystemFeedbackCard />
                </div>

                {/* CSV Export */}
                <div className="md:col-span-12 flex justify-end">
                  <AdminCSVExport
                    events={(data as any).rallyEventsRaw ?? data.rallyEvents}
                    attendees={(data as any).attendeesRaw ?? data.attendees}
                    label="Export Partner Report"
                  />
                </div>
              </div>
            )}

            {viewMode === 'commercial' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-12">
                  <CommercialDashboard
                    totalGMV={data.commercial?.totalGMV ?? 0}
                    paidEventsCount={data.commercial?.paidEventsCount ?? 0}
                    providerSplit={data.transit?.providerSplit ?? {}}
                    eventsByCity={data.commercial?.eventsByCity ?? []}
                    avgDwellTime={data.avgDwellTime}
                  />
                </div>
                <HeatMap eventLocations={(data as any).eventLocations ?? []} span={12} />
                <div className="md:col-span-12 flex justify-end">
                  <AdminCSVExport
                    events={(data as any).rallyEventsRaw ?? data.rallyEvents}
                    attendees={(data as any).attendeesRaw ?? data.attendees}
                    label="Export Commercial Report"
                  />
                </div>
              </div>
            )}

            {viewMode === 'technical' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <FunnelChart funnel={data.funnel} modeSplit={data.modeSplit} />
                </div>
                <div className="md:col-span-6">
                  <OnboardingDropoff />
                </div>

                <div className="md:col-span-6">
                  <UserIntelligence
                    profiles={data.profiles}
                    attendees={(data as any).attendeesRaw ?? data.attendees}
                    rallyEvents={(data as any).rallyEventsRaw ?? data.rallyEvents}
                    headcountByEvent={(data as any).headcountByEvent ?? {}}
                  />
                </div>
                <div className="md:col-span-6">
                  <ErrorLogFeed />
                </div>

                <div className="md:col-span-6">
                  <LiveActivityFeed />
                </div>
                <div className="md:col-span-6">
                  <FeatureFlags />
                </div>

                <div className="md:col-span-12">
                  <SquadAudit />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
