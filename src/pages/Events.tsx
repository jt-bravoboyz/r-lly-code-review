import { BottomNav } from '@/components/layout/BottomNav';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { QuickRallyDialog } from '@/components/events/QuickRallyDialog';
import { useMyEvents } from '@/hooks/useMyEvents';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Filter, Search, Link2, Sparkles, Calendar, History, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EVENT_TYPES } from '@/lib/eventTypes';
import rallyLogo from '@/assets/rally-logo.png';

export default function Events() {
  const { user, profile, loading: authLoading } = useAuth();
  const { data: categorizedEvents, isLoading } = useMyEvents();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const location = useLocation();
  
  // Get preselected squad from navigation state (from Squads page Quick Rally)
  const preselectedSquad = location.state?.inviteSquad;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary to-orange-600">
        <div className="flex flex-col items-center gap-4">
          <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse shadow-2xl ring-4 ring-white/30">
            <img 
              src={rallyLogo} 
              alt="R@lly" 
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>
      </div>
    );
  }

  const currentEvents = categorizedEvents?.current || [];
  const upcomingEvents = categorizedEvents?.upcoming || [];
  const pastEvents = categorizedEvents?.past || [];

  // Filter events based on search and type
  const filterEvents = (events: typeof currentEvents) => {
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || event.event_type === typeFilter;
      return matchesSearch && matchesType;
    });
  };

  const filteredCurrent = filterEvents(currentEvents);
  const filteredUpcoming = filterEvents(upcomingEvents);
  const filteredPast = filterEvents(pastEvents);

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
            <Zap className="h-5 w-5" strokeWidth={2.5} />
            R@lly
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
      
      <main className="px-4 py-6 space-y-6 relative z-10">
        {/* Search and Filter */}
        <div className="flex gap-3 animate-fade-in">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search rally..." 
              className="pl-11 rounded-full bg-white/80 backdrop-blur-sm border-primary/20 shadow-sm focus:shadow-md focus:border-primary/40 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-full shrink-0 bg-white/80 backdrop-blur-sm border-primary/20 hover:bg-primary hover:text-white hover:border-primary transition-all" asChild>
            <Link to="/join">
              <Link2 className="h-4 w-4" />
            </Link>
          </Button>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] rounded-full bg-white/80 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick R@lly Card - BOLD & VIBRANT */}
        <Card className="bg-gradient-to-r from-yellow-400 via-orange-500 to-primary border-0 shadow-xl shadow-orange-500/30 overflow-hidden group hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 hover:scale-[1.01] animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-5 flex items-center justify-between relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform" />
            <div className="absolute bottom-0 left-10 w-20 h-20 bg-white/5 rounded-full translate-y-1/2" />
            
            <div className="relative z-10">
              <h3 className="font-extrabold text-white text-xl font-montserrat flex items-center gap-2 drop-shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" strokeWidth={2.5} fill="currentColor" />
                </div>
                Quick R@lly
              </h3>
              <p className="text-white/90 text-sm font-montserrat mt-1 ml-12">Start rallying in seconds</p>
            </div>
            <QuickRallyDialog preselectedSquad={preselectedSquad} />
          </CardContent>
        </Card>

        {/* Create Event Button */}
        <Card className="bg-gradient-to-r from-primary/90 via-primary to-orange-600 border-0 shadow-lg shadow-primary/20 overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.01] animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-5 flex items-center justify-between relative">
            <div className="absolute top-0 right-20 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2" />
            
            <div className="relative z-10">
              <h3 className="font-bold text-white text-lg font-montserrat flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" strokeWidth={2} />
                </div>
                Plan a R@lly
              </h3>
              <p className="text-white/80 text-sm font-montserrat ml-11">Schedule for later</p>
            </div>
            <CreateEventDialog />
          </CardContent>
        </Card>

        {/* Live Now Section */}
        {filteredCurrent.length > 0 && (
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h2 className="text-xl font-bold text-foreground font-montserrat">Live Now</h2>
              </div>
              <Clock className="h-5 w-5 text-green-500" />
            </div>

            <div className="space-y-4">
              {filteredCurrent.map((event, index) => (
                <div key={event.id} className="relative animate-fade-in" style={{ animationDelay: `${0.25 + index * 0.1}s` }}>
                  <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500 to-green-400 rounded-full" />
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Section */}
        <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground font-montserrat flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Upcoming R@lly
            </h2>
            <span className="text-sm text-muted-foreground bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full">{filteredUpcoming.length} events</span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-28 animate-pulse bg-gradient-to-r from-muted to-muted/50 border-0 rounded-2xl" />
              ))}
            </div>
          ) : filteredUpcoming.length > 0 ? (
            <div className="space-y-4">
              {filteredUpcoming.map((event, index) => (
                <div key={event.id} className="animate-fade-in" style={{ animationDelay: `${0.3 + index * 0.1}s` }}>
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          ) : (
            <Card className="bg-gradient-to-br from-white to-secondary/30 shadow-lg rounded-2xl border-0 overflow-hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <CardContent className="p-8 text-center relative">
                <div className="absolute top-0 left-1/2 w-32 h-32 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-orange-400/20 mx-auto mb-4 flex items-center justify-center relative">
                  <Zap className="h-8 w-8 text-primary" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground font-montserrat">No upcoming R@lly</h3>
                <p className="text-muted-foreground mb-6 font-montserrat">Be the first to start one!</p>
                <QuickRallyDialog />
              </CardContent>
            </Card>
          )}
        </section>

        {/* Past R@lly Section */}
        <section className="space-y-4 animate-fade-in mt-8" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground font-montserrat flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Past R@lly
            </h2>
            <span className="text-sm text-muted-foreground bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full">
              {filteredPast.length} events
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="h-28 animate-pulse bg-gradient-to-r from-muted to-muted/50 border-0 rounded-2xl" />
              ))}
            </div>
          ) : filteredPast.length > 0 ? (
            <div className="space-y-4">
              {filteredPast.map((event, index) => (
                <div key={event.id} className="animate-fade-in opacity-75 hover:opacity-100 transition-opacity" style={{ animationDelay: `${0.4 + index * 0.1}s` }}>
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30 border-dashed border-2 border-muted rounded-2xl animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <CardContent className="p-6 text-center">
                <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground font-montserrat text-sm">No past R@llys yet</p>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
