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
import { Shield, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { data, isLoading } = useAdminAnalytics();

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
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-auto">
            Phase 6
          </span>
        </div>
      </header>

      <main className="container py-6 space-y-6 pb-12">
        {isLoading || !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Section 1: Summary Cards */}
            <AnalyticsCards summary={data.summary} sparkline={data.sparkline} />

            {/* Section 2 & 3 side by side on large screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FunnelChart funnel={data.funnel} modeSplit={data.modeSplit} />
              <SafetyMetrics safety={data.safety} attendees={data.attendees} />
            </div>

            {/* Section 4 & 5 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GrowthMetrics growth={data.growth} />
              <FounderPanel
                founders={data.founders}
                attendees={data.attendees}
                rallyEvents={data.rallyEvents}
              />
            </div>

            {/* Section 6 & 7 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FeedbackPanel feedback={data.feedback} profiles={data.profiles} />
              <UserIntelligence
                profiles={data.profiles}
                attendees={data.attendees}
                rallyEvents={data.rallyEvents}
              />
            </div>

            {/* Section 8 & 9 */}
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
