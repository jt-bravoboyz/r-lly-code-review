import { Link } from 'react-router-dom';
import { Calendar, Car, Users, MapPin, ArrowRight, Sparkles } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="max-w-md space-y-6 animate-slide-up">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-bold">
              <span className="text-gradient">Rally</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Join the party, find your crew, get home safe
            </p>
            
            <div className="grid grid-cols-3 gap-4 pt-6">
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card">
                <Calendar className="h-6 w-6 text-primary" />
                <span className="text-xs text-muted-foreground">Events</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card">
                <Users className="h-6 w-6 text-secondary" />
                <span className="text-xs text-muted-foreground">Friends</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card">
                <Car className="h-6 w-6 text-accent" />
                <span className="text-xs text-muted-foreground">Safe Rides</span>
              </div>
            </div>

            <Button asChild size="lg" className="w-full gradient-primary mt-8">
              <Link to="/auth">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const upcomingEvents = events?.slice(0, 3) || [];

  return (
    <div className="min-h-screen pb-20">
      <Header />
      
      <main className="container py-6 space-y-6">
        {/* Welcome Section */}
        <section className="space-y-2">
          <h2 className="text-2xl font-bold">
            Hey, {profile?.display_name || 'there'}! 👋
          </h2>
          <p className="text-muted-foreground">What's the plan tonight?</p>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-4">
          <Link to="/events">
            <Card className="h-full transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <div className="p-3 rounded-full gradient-primary">
                  <Calendar className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="font-medium">Find Events</span>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/rides">
            <Card className="h-full transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <div className="p-3 rounded-full gradient-accent">
                  <Car className="h-6 w-6 text-accent-foreground" />
                </div>
                <span className="font-medium">DD Mode</span>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Upcoming Events */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upcoming Events</h3>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/events">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {eventsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="h-32 animate-pulse bg-muted" />
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No upcoming events yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link to="/events">Create one!</Link>
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