import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useAllMySquads, Squad } from '@/hooks/useSquads';
import { SquadCard } from '@/components/squads/SquadCard';
import { CreateSquadDialog } from '@/components/squads/CreateSquadDialog';
import { ContactsTab } from '@/components/squads/ContactsTab';
import { PendingSquadInvites } from '@/components/squads/PendingSquadInvites';
import { DirectMessagesList } from '@/components/chat/DirectMessagesList';
import { FriendsList } from '@/components/friends/FriendsList';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Sparkles, Contact, MessageCircle, UserCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePendingFriendRequestCount } from '@/hooks/usePendingFriendRequests';
import rallyLogo from '@/assets/rally-logo.png';

const VALID_TABS = ['squads', 'friends', 'messages', 'contacts'] as const;
type TabValue = typeof VALID_TABS[number];

export default function Squads() {
  const { profile, loading: authLoading, hasResolvedOnce } = useAuth();
  const { data: squads, isLoading } = useAllMySquads();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: pendingFriendCount = 0 } = usePendingFriendRequestCount();

  const initialTab = (() => {
    const t = searchParams.get('tab');
    return t && (VALID_TABS as readonly string[]).includes(t) ? (t as TabValue) : 'squads';
  })();
  const [tab, setTab] = useState<TabValue>(initialTab);

  // Sync URL tab param if changed externally
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && (VALID_TABS as readonly string[]).includes(t) && t !== tab) {
      setTab(t as TabValue);
    }
  }, [searchParams, tab]);

  const handleTabChange = (next: string) => {
    const v = (VALID_TABS as readonly string[]).includes(next) ? (next as TabValue) : 'squads';
    setTab(v);
    const params = new URLSearchParams(searchParams);
    if (v === 'squads') params.delete('tab');
    else params.set('tab', v);
    setSearchParams(params, { replace: true });
  };

  if (!hasResolvedOnce && authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-primary via-primary to-primary/80">
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
    <div className="min-h-[100dvh] pb-bottom-nav bg-gradient-to-b from-secondary/30 via-background to-secondary/20 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Header title="Squads" icon={<Users className="h-5 w-5" strokeWidth={2.5} />} />

      <main className="px-4 py-6 relative z-10">
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-white/80 backdrop-blur-sm rounded-xl p-1">
            <TabsTrigger value="squads" className="rounded-lg font-montserrat text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-1" />
              Squads
            </TabsTrigger>
            <TabsTrigger value="friends" className="relative rounded-lg font-montserrat text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
              <UserCheck className="h-4 w-4 mr-1" />
              Friends
              {pendingFriendCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {pendingFriendCount > 9 ? '9+' : pendingFriendCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="rounded-lg font-montserrat text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
              <MessageCircle className="h-4 w-4 mr-1" />
              DMs
            </TabsTrigger>
            <TabsTrigger value="contacts" className="rounded-lg font-montserrat text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
              <Contact className="h-4 w-4 mr-1" />
              Contacts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="squads" className="space-y-6 animate-fade-in">
            <PendingSquadInvites />

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
              <Card className="bg-gradient-to-br from-card to-card/80 dark:from-card/90 dark:to-card/60 shadow-lg dark:shadow-[0_8px_32px_hsl(var(--primary)/0.06)] rounded-2xl border-0 dark:border dark:border-white/[0.06] overflow-hidden backdrop-blur-xl">
                <CardContent className="p-8 text-center relative">
                  <div className="absolute top-0 left-1/2 w-32 h-32 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/15 mx-auto mb-4 flex items-center justify-center relative">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-foreground font-montserrat">No squads yet</h3>
                  <p className="text-muted-foreground mb-6 font-montserrat">
                    Create a squad to quickly invite your squad to R@llies!
                  </p>
                  <CreateSquadDialog />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="friends" className="animate-fade-in">
            <FriendsList />
          </TabsContent>

          <TabsContent value="messages" className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-foreground font-montserrat flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Direct Messages
              </h2>
              <p className="text-sm text-muted-foreground">Private 1-on-1 convos with your R@lly Friends</p>
            </div>
            <DirectMessagesList />
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
