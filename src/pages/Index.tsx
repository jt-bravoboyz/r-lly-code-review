import { Link } from 'react-router-dom';
import { Zap, Car, Users, MapPin, ArrowRight, Navigation, Home as HomeIcon, Beer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { EventCard } from '@/components/events/EventCard';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-8 animate-slide-up">
            {/* Logo */}
            <div className="space-y-4">
              <h1 className="text-6xl font-black tracking-tighter">
                <span className="text-primary">R</span>
                <span className="text-foreground">@</span>
                <span className="text-primary">LLY</span>
              </h1>
              <p className="text-xl text-muted-foreground font-medium">
                Plan fast. Stay synced. Move together.
              </p>
            </div>
            
            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-3 pt-6">
              <FeatureCard 
                icon={<Zap className="h-5 w-5" />}
                title="Quick Rally"
                desc="Create in seconds"
              />
              <FeatureCard 
                icon={<Beer className="h-5 w-5" />}
                title="Bar Hop"
                desc="Multiple stops"
              />
              <FeatureCard 
                icon={<Navigation className="h-5 w-5" />}
                title="Live Tracking"
                desc="Turn-by-turn"
              />
              <FeatureCard 
                icon={<Car className="h-5 w-5" />}
                title="Rally Ride"
                desc="DD coordination"
              />
            </div>

            <Button asChild size="lg" className="w-full btn-rally text-lg h-14 mt-8">
              <Link to="/auth">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Your crew is waiting
            </p>
          </div>
        </div>
      </div>
    );
  }

  const upcomingEvents = events?.slice(0, 3) || [];

  return (
    <div className="min-h-screen pb-24 bg-background">
      <Header />
      
      <main className="container py-6 space-y-6">
        {/* Welcome Section */}
        <section className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            What's the plan, {profile?.display_name || 'there'}?
          </h2>
          <p className="text-muted-foreground">Rally your crew</p>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3">
          <Link to="/events">
            <Card className="h-full card-rally group">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <span className="font-bold block">Start Rally</span>
                  <span className="text-xs text-muted-foreground">Create in seconds</span>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/rides">
            <Card className="h-full card-rally group">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <span className="font-bold block">Rally Ride</span>
                  <span className="text-xs text-muted-foreground">DD mode</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Rally Home Quick Action */}
        <Card className="card-rally border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <HomeIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Rally Home</h3>
                  <p className="text-xs text-muted-foreground">One-tap "I'm going home"</p>
                </div>
              </div>
              <Button size="sm" className="btn-rally">
                Set Up
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Rallies */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Active Rallies</h3>
            <Button variant="ghost" size="sm" asChild className="text-primary">
              <Link to="/events">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="h-28 animate-pulse bg-muted border-0" />
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Card className="card-rally">
              <CardContent className="p-8 text-center">
                <Zap className="h-10 w-10 mx-auto text-primary/50 mb-3" />
                <h4 className="font-bold mb-1">No active rallies</h4>
                <p className="text-sm text-muted-foreground mb-4">Start one and rally your crew!</p>
                <Button asChild className="btn-rally">
                  <Link to="/events">Create Rally</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border text-left">
      <div className="text-primary mb-2">{icon}</div>
      <h3 className="font-bold text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
