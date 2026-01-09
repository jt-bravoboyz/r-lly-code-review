import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Zap } from 'lucide-react';

export default function Events() {
  const { user, loading: authLoading } = useAuth();
  const { data: events, isLoading } = useEvents();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <Header title="Rallies" />
      
      <main className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rallies</h1>
            <p className="text-sm text-muted-foreground">Find or create your next adventure</p>
          </div>
          <CreateEventDialog />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-28 animate-pulse bg-muted border-0" />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Card className="card-rally">
            <CardContent className="p-12 text-center">
              <Zap className="h-12 w-12 mx-auto text-primary/50 mb-4" />
              <h3 className="text-lg font-bold mb-2">No rallies yet</h3>
              <p className="text-muted-foreground mb-6">Be the first to start one!</p>
              <CreateEventDialog />
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
