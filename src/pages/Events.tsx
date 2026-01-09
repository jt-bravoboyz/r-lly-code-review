import { BottomNav } from '@/components/layout/BottomNav';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { QuickRallyDialog } from '@/components/events/QuickRallyDialog';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Filter, Search, Link2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import rallyLogo from '@/assets/rally-logo.png';

export default function Events() {
  const { user, profile, loading: authLoading } = useAuth();
  const { data: events, isLoading } = useEvents();
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  
  // Get preselected squad from navigation state (from Squads page Quick Rally)
  const preselectedSquad = location.state?.inviteSquad;

  // Dev mode - bypass auth
  const isDev = true;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-rally-cream flex items-center justify-center">
            <img 
              src={rallyLogo} 
              alt="R@lly" 
              className="w-14 h-14 object-contain"
            />
          </div>
        </div>
      </div>
    );
  }

  // Filter events based on search
  const filteredEvents = events?.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Custom Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="h-6" />
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/">
            <img src={rallyLogo} alt="R@lly" className="h-10 w-10 object-contain" />
          </Link>
          <h1 className="text-xl font-bold text-rally-dark font-montserrat">Rally</h1>
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
        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search rally..." 
              className="pl-10 rounded-full bg-white border-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-full shrink-0" asChild>
            <Link to="/join">
              <Link2 className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" className="rounded-full shrink-0">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Rally Card - Prominent */}
        <Card className="bg-gradient-to-r from-secondary to-secondary/80 border-0 shadow-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-lg font-montserrat flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick R@lly
              </h3>
              <p className="text-white/80 text-sm font-montserrat">Start rallying in seconds</p>
            </div>
            <QuickRallyDialog preselectedSquad={preselectedSquad} />
          </CardContent>
        </Card>

        {/* Create Event Button */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 border-0 shadow-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-lg font-montserrat">Plan a Rally</h3>
              <p className="text-white/80 text-sm font-montserrat">Schedule for later</p>
            </div>
            <CreateEventDialog />
          </CardContent>
        </Card>

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-rally-dark font-montserrat">Upcoming Rally</h2>
          <span className="text-sm text-muted-foreground">{filteredEvents.length} events</span>
        </div>

        {/* Events List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-28 animate-pulse bg-muted border-0 rounded-2xl" />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Card className="bg-white shadow-sm rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-rally-light mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-rally-dark font-montserrat">No rally yet</h3>
              <p className="text-muted-foreground mb-6 font-montserrat">Be the first to start one!</p>
              <QuickRallyDialog />
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
