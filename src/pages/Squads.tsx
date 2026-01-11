import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useAllMySquads, Squad } from '@/hooks/useSquads';
import { SquadCard } from '@/components/squads/SquadCard';
import { CreateSquadDialog } from '@/components/squads/CreateSquadDialog';
import { ContactsTab } from '@/components/squads/ContactsTab';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Sparkles, Contact } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import rallyLogo from '@/assets/rally-logo.png';

export default function Squads() {
  const { profile, loading: authLoading } = useAuth();
  const { data: squads, isLoading } = useAllMySquads();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary to-orange-600">
        <div className="flex flex-col items-center gap-4">
          <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse shadow-2xl ring-4 ring-white/30">
            <img src={rallyLogo} alt="R@lly" className="w-16 h-16 object-contain" />
          </div>
        </div>
      </div>
    );
  }

  const handleQuickRally = (squad: Squad) => {
    navigate('/events', { state: { inviteSquad: squad } });
  };

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-b from-secondary/30 via-background to-secondary/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-10 w-40 h-40 bg-yellow-400/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Modern gradient header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-primary via-primary to-orange-500 shadow-lg shadow-primary/20">
        <div className="h-6" />
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="relative">
            <div className="absolute inset-0 bg-white/30 rounded-full blur-sm" />
            <img src={rallyLogo} alt="R@lly" className="h-11 w-11 object-contain relative filter drop-shadow-lg brightness-0 invert" />
          </Link>
          <h1 className="text-xl font-bold text-white font-montserrat drop-shadow-sm flex items-center gap-2">
            <Users className="h-5 w-5" strokeWidth={2.5} />
            Squads
          </h1>
          <Link to="/profile" className="relative group">
            <div className="absolute inset-0 bg-white/30 rounded-full blur-sm scale-110" />
            <Avatar className="h-11 w-11 ring-2 ring-white/50 hover:ring-white transition-all relative shadow-lg">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-white text-primary text-sm font-bold">
                {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>

      <main className="px-4 py-6 relative z-10">
        <Tabs defaultValue="squads" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/80 backdrop-blur-sm rounded-xl p-1">
            <TabsTrigger value="squads" className="rounded-lg font-montserrat data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Squads
            </TabsTrigger>
            <TabsTrigger value="contacts" className="rounded-lg font-montserrat data-[state=active]:bg-primary data-[state=active]:text-white">
              <Contact className="h-4 w-4 mr-2" />
              Contacts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="squads" className="space-y-6 animate-fade-in">
            {/* Header with create button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground font-montserrat flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Your Squads
                </h2>
                <p className="text-sm text-muted-foreground">Save your favorite groups for quick invites</p>
              </div>
              <CreateSquadDialog />
            </div>

            {/* Squads list */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-32 animate-pulse bg-gradient-to-r from-muted to-muted/50 border-0 rounded-2xl" />
                ))}
              </div>
            ) : squads && squads.length > 0 ? (
              <div className="space-y-4">
                {squads.map((squad, index) => (
                  <div key={squad.id} className="animate-fade-in" style={{ animationDelay: `${0.1 + index * 0.1}s` }}>
                    <SquadCard squad={squad} onQuickRally={handleQuickRally} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-white to-secondary/30 shadow-lg rounded-2xl border-0 overflow-hidden">
                <CardContent className="p-8 text-center relative">
                  <div className="absolute top-0 left-1/2 w-32 h-32 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-orange-400/20 mx-auto mb-4 flex items-center justify-center relative">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-foreground font-montserrat">No squads yet</h3>
                  <p className="text-muted-foreground mb-6 font-montserrat">
                    Create a squad to quickly invite your squad to rallies!
                  </p>
                  <CreateSquadDialog />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="contacts" className="animate-fade-in">
            <ContactsTab />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
