import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Trophy, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { 
  useBadgeState, 
  useActivityBadges, 
  usePointsHistory
} from '@/hooks/useBadgeSystem';
import { TierBadgeIcon } from '@/components/badges/TierBadgeIcon';
import { TierLadder } from '@/components/badges/TierLadder';
import { ActivityBadgeGrid } from '@/components/badges/ActivityBadgeGrid';
import { PointsHistoryList } from '@/components/badges/PointsHistoryList';
import { cn } from '@/lib/utils';

export default function Achievements() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { state, currentTier, nextTier, progress, isLoading: badgeLoading, allTiers } = useBadgeState();
  const { badges, isLoading: badgesLoading } = useActivityBadges();
  const { data: pointsHistory, isLoading: historyLoading } = usePointsHistory(50);
  
  const [historyOpen, setHistoryOpen] = useState(false);

  // Tier-up listener is now handled globally by TierUpProvider

  const isLoading = authLoading || badgeLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Sign in to view your badges</h2>
        <p className="text-muted-foreground text-center mb-6">
          Track your progress and earn rewards by joining R@llys!
        </p>
        <Button onClick={() => navigate('/auth')} className="btn-rally">
          Sign In
        </Button>
      </div>
    );
  }

  const earnedBadges = badges.filter(b => b.isEarned);

  return (
    <div className="min-h-screen pb-24 bg-background">
      <Header title="Badges & Ranks" />
      
      <main className="container py-6 space-y-6">
        {/* Current Tier Card */}
        <Card className="overflow-hidden border-primary/20">
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col items-center gap-4">
              {/* Badge Icon */}
              <TierBadgeIcon 
                tier={currentTier} 
                size="xl" 
                showGlow 
              />

              {/* Tier Name */}
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  {currentTier?.tier_name || 'Unranked'}
                </h2>
                {!currentTier && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Earn 50 points to reach Bronze
                  </p>
                )}
              </div>

              {/* Points Display */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
                <Star className="w-4 h-4 text-primary" />
                <span className="font-bold text-lg">{state?.total_points || 0}</span>
                <span className="text-sm text-muted-foreground">points</span>
              </div>

              {/* Progress to Next Tier */}
              {nextTier && (
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{currentTier?.tier_name}</span>
                    <span>{nextTier.tier_name}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    {progress.pointsToNext} points to {nextTier.tier_name}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Badges */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Activity Badges
              {earnedBadges.length > 0 && (
                <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                  {earnedBadges.length}/{badges.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {badgesLoading ? (
              <div className="h-32 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ActivityBadgeGrid badges={badges} />
            )}
          </CardContent>
        </Card>

        {/* Tier Ladder */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Tiers</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {allTiers && (
              <TierLadder 
                tiers={allTiers}
                currentTierKey={currentTier?.tier_key || null}
                totalPoints={state?.total_points || 0}
              />
            )}
          </CardContent>
        </Card>

        {/* Points History (Collapsible) */}
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Points History</span>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform',
                    historyOpen && 'rotate-180'
                  )} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {historyLoading ? (
                  <div className="h-32 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <PointsHistoryList entries={pointsHistory || []} />
                  </ScrollArea>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </main>

      <BottomNav />
    </div>
  );
}
