import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, MessageSquare, Sparkles, Trophy, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBadges } from '@/hooks/useBadges';
import { Navigate } from 'react-router-dom';
import { getBadgeProgress, type BadgeDefinition, type UserStats } from '@/lib/badges';

function BadgeCard({ badge, earned, stats }: { badge: BadgeDefinition; earned: boolean; stats: UserStats }) {
  const progress = getBadgeProgress(badge, stats);
  const current = stats[badge.statKey] || 0;

  return (
    <Card className={`card-rally transition-all ${earned ? 'ring-2 ring-primary/50' : 'opacity-70'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`text-3xl ${earned ? '' : 'grayscale opacity-50'}`}>
            {earned ? badge.icon : <Lock className="h-8 w-8 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{badge.name}</h3>
              {earned && (
                <Badge variant="default" className="text-xs">Earned</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{badge.description}</p>
            
            {!earned && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{current} / {badge.requirement}</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Achievements() {
  const { user, profile, loading } = useAuth();
  const { stats, statsLoading, earnedBadges, unearnedBadges, allBadges, checkAndAwardBadges } = useBadges();

  // Check for new badges when stats load
  useEffect(() => {
    if (!statsLoading && stats && profile) {
      checkAndAwardBadges();
    }
  }, [statsLoading, stats, profile]);

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

  const rallyBadges = allBadges.filter(b => b.category === 'rally');
  const safetyBadges = allBadges.filter(b => b.category === 'safety');
  const socialBadges = allBadges.filter(b => b.category === 'social');

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'rally': return <Users className="h-4 w-4" />;
      case 'safety': return <Shield className="h-4 w-4" />;
      case 'social': return <MessageSquare className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <Header title="Achievements" />
      
      <main className="container py-6 space-y-6">
        {/* Stats Overview */}
        <Card className="card-rally bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{earnedBadges.length} / {allBadges.length}</h2>
                <p className="text-muted-foreground">Badges Earned</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
              <div className="text-center">
                <div className="text-lg font-bold">{stats.rallies_attended}</div>
                <div className="text-xs text-muted-foreground">Rallies</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{stats.dd_trips}</div>
                <div className="text-xs text-muted-foreground">DD Trips</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{stats.safe_homes}</div>
                <div className="text-xs text-muted-foreground">Safe Homes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earned Badges Showcase */}
        {earnedBadges.length > 0 && (
          <Card className="card-rally">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Your Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {earnedBadges.map(badge => (
                  <div 
                    key={badge.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
                    title={badge.description}
                  >
                    <span className="text-lg">{badge.icon}</span>
                    <span className="text-sm font-medium">{badge.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Badges by Category */}
        <Tabs defaultValue="rally" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="rally" className="flex items-center gap-1.5">
              {getCategoryIcon('rally')}
              <span className="hidden sm:inline">Rally</span>
            </TabsTrigger>
            <TabsTrigger value="safety" className="flex items-center gap-1.5">
              {getCategoryIcon('safety')}
              <span className="hidden sm:inline">Safety</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-1.5">
              {getCategoryIcon('social')}
              <span className="hidden sm:inline">Social</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rally" className="mt-4 space-y-3">
            {rallyBadges.map(badge => (
              <BadgeCard 
                key={badge.id} 
                badge={badge} 
                earned={(profile?.badges || []).includes(badge.id)}
                stats={stats}
              />
            ))}
          </TabsContent>

          <TabsContent value="safety" className="mt-4 space-y-3">
            {safetyBadges.map(badge => (
              <BadgeCard 
                key={badge.id} 
                badge={badge} 
                earned={(profile?.badges || []).includes(badge.id)}
                stats={stats}
              />
            ))}
          </TabsContent>

          <TabsContent value="social" className="mt-4 space-y-3">
            {socialBadges.map(badge => (
              <BadgeCard 
                key={badge.id} 
                badge={badge} 
                earned={(profile?.badges || []).includes(badge.id)}
                stats={stats}
              />
            ))}
          </TabsContent>
        </Tabs>

        {/* Reward Points Info */}
        <Card className="card-rally">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-xl">💎</span>
                </div>
                <div>
                  <p className="font-medium">Reward Points</p>
                  <p className="text-xs text-muted-foreground">Earn 10 points per badge</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-primary">
                {profile?.reward_points || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
