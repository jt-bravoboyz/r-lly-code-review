import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useSquads, Squad } from '@/hooks/useSquads';
import { SquadCard } from '@/components/squads/SquadCard';
import { CreateSquadDialog } from '@/components/squads/CreateSquadDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import rallyLogo from '@/assets/rally-logo.png';

export default function Squads() {
  const { profile, loading: authLoading } = useAuth();
  const { data: squads, isLoading } = useSquads();
  const navigate = useNavigate();

  // Dev mode - bypass auth
  const isDev = true;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-rally-cream flex items-center justify-center">
            <img src={rallyLogo} alt="R@lly" className="w-14 h-14 object-contain" />
          </div>
        </div>
      </div>
    );
  }

  const handleQuickRally = (squad: Squad) => {
    // Navigate to events with squad pre-selected for invite
    navigate('/events', { state: { inviteSquad: squad } });
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="h-6" />
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/">
            <img src={rallyLogo} alt="R@lly" className="h-10 w-10 object-contain" />
          </Link>
          <h1 className="text-xl font-bold text-rally-dark font-montserrat">Squads</h1>
          <Link to="/profile">
            <Avatar className="h-10 w-10 ring-2 ring-primary/30 hover:ring-primary/50 transition-all">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Header with create button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-rally-dark font-montserrat">Your Squads</h2>
            <p className="text-sm text-muted-foreground">Save your favorite groups for quick invites</p>
          </div>
          <CreateSquadDialog />
        </div>

        {/* Squads list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-32 animate-pulse bg-muted border-0 rounded-2xl" />
            ))}
          </div>
        ) : squads && squads.length > 0 ? (
          <div className="space-y-4">
            {squads.map((squad) => (
              <SquadCard key={squad.id} squad={squad} onQuickRally={handleQuickRally} />
            ))}
          </div>
        ) : (
          <Card className="bg-white shadow-sm rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-rally-light mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-rally-dark font-montserrat">No squads yet</h3>
              <p className="text-muted-foreground mb-6 font-montserrat">
                Create a squad to quickly invite your squad to rallies!
              </p>
              <CreateSquadDialog />
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
