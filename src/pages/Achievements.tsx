import { useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { BadgeIcon } from '@/components/badges/BadgeIcon';
import { 
  BADGE_TIERS, 
  getCurrentTier, 
  getNextTier, 
  getProgressToNextTier, 
  getMotivationalMessage 
} from '@/lib/badges';

function TierMilestone({ tier, isActive, isCompleted }: { 
  tier: typeof BADGE_TIERS[0]; 
  isActive: boolean; 
  isCompleted: boolean;
}) {
  return (
    <div className="flex flex-col items-center shrink-0">
      <div 
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
          isCompleted 
            ? 'bg-primary' 
            : isActive 
              ? 'bg-primary ring-2 ring-primary/30' 
              : 'bg-muted-foreground/30'
        }`}
      >
        {isCompleted && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </div>
  );
}

export default function Achievements() {
  const { user, profile, loading } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const points = profile?.reward_points || 0;
  const currentTier = getCurrentTier(points);
  const nextTier = getNextTier(points);
  const progress = getProgressToNextTier(points);
  const message = getMotivationalMessage(currentTier.id);

  const pointsToNext = nextTier ? nextTier.pointsRequired - points : 0;

  return (
    <div className="min-h-screen pb-24 bg-background">
      <Header title="Your Badge" />
      
      <main className="container py-6 space-y-6">
        {/* Reward Points Card */}
        <Card className="bg-white shadow-sm rounded-lg overflow-hidden">
          <CardContent className="py-4 flex flex-col items-center gap-3">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Your Reward Points!
            </h2>
            <div 
              className="px-8 py-4 rounded-lg"
              style={{ background: 'hsl(var(--primary) / 0.1)' }}
            >
              <span 
                className="text-3xl font-bold text-primary"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {points}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Current Badge Card */}
        <Card className="bg-white shadow-sm rounded-lg overflow-hidden">
          <CardContent className="py-4 flex flex-col items-center gap-2">
            {/* Current Badge Label */}
            <div 
              className="px-4 py-1 rounded-full flex items-center gap-2"
              style={{ background: 'hsl(var(--primary) / 0.1)' }}
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ background: currentTier.accentColor }}
              />
              <span className="text-xs font-medium text-muted-foreground">Current Badge</span>
            </div>
            
            {/* Large Badge Icon */}
            <BadgeIcon tier={currentTier} size="lg" />
            
            {/* Badge Name */}
            <h3 
              className="text-lg font-bold text-foreground"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {currentTier.name}
            </h3>
          </CardContent>
        </Card>

        {/* All Badges Section */}
        <div className="space-y-3">
          <h3 
            className="text-base font-bold text-foreground"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            All Badge
          </h3>
          
          {/* Horizontal Scrolling Badge List */}
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {BADGE_TIERS.map((tier) => {
                const isUnlocked = points >= tier.pointsRequired;
                return (
                  <Card 
                    key={tier.id} 
                    className={`shrink-0 bg-white shadow-sm rounded-lg overflow-hidden transition-all ${
                      tier.id === currentTier.id ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <CardContent className="p-2 flex flex-col items-center gap-1.5 w-[90px]">
                      <BadgeIcon tier={tier} size="sm" locked={!isUnlocked} />
                      <span 
                        className="text-xs font-medium text-foreground text-center truncate w-full"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      >
                        {tier.name}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Progress Bar with Milestones */}
          <div className="relative py-4">
            {/* Progress Track */}
            <div className="relative h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-500"
                style={{ 
                  width: `${(BADGE_TIERS.findIndex(t => t.id === currentTier.id) + progress.progress / 100) / BADGE_TIERS.length * 100}%` 
                }}
              />
            </div>
            
            {/* Milestone Markers */}
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-0">
              {BADGE_TIERS.map((tier, index) => {
                const tierIndex = BADGE_TIERS.findIndex(t => t.id === currentTier.id);
                const isCompleted = index < tierIndex;
                const isActive = index === tierIndex;
                
                return (
                  <TierMilestone 
                    key={tier.id}
                    tier={tier}
                    isActive={isActive}
                    isCompleted={isCompleted}
                  />
                );
              })}
            </div>
          </div>

          {/* Points to Next Badge */}
          {nextTier && (
            <p 
              className="text-xs font-medium text-muted-foreground text-center"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Earn {pointsToNext} more points to unlock your next badge.
            </p>
          )}
        </div>

        {/* Motivational Message Card */}
        <Card className="bg-white shadow-sm rounded-lg overflow-hidden">
          <CardContent className="py-4 px-4">
            <p 
              className="text-base text-muted-foreground leading-relaxed"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {message}
            </p>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
