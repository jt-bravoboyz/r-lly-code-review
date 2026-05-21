import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BottomNav } from '@/components/layout/BottomNav';
import { EventCard } from '@/components/events/EventCard';
import { useAuth } from '@/hooks/useAuth';
import { useMyEvents } from '@/hooks/useMyEvents';

export default function PastRallies() {
  const { user, loading } = useAuth();
  const { data: categorized, isLoading } = useMyEvents();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const past = categorized?.past ?? [];

  return (
    <div className="min-h-[100dvh] pb-bottom-nav bg-gradient-to-b from-secondary/30 via-background to-secondary/20">
      <header className="sticky top-0 z-40 bg-primary backdrop-blur-xl border-b border-white/[0.12] shadow-[0_4px_30px_hsl(22,90%,52%/0.2)]" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
        <div style={{ height: 'env(safe-area-inset-top, 1.5rem)' }} />
        <div className="flex items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/15 rounded-full">
            <Link to="/" aria-label="Back to home">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-white font-montserrat drop-shadow-sm flex items-center gap-2">
            <History className="h-5 w-5" strokeWidth={2.5} />
            Past R@llies
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-48 bg-muted/50 dark:bg-white/[0.04] border-border/40 rounded-2xl" />
            ))}
          </div>
        ) : past.length === 0 ? (
          <Card className="glass-elevated rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 mx-auto mb-4 flex items-center justify-center border border-primary/20">
                <History className="h-8 w-8 text-primary" strokeWidth={2} />
              </div>
              <h2 className="font-bold text-lg mb-2 font-montserrat">No R@llies in the books yet</h2>
              <p className="text-sm text-muted-foreground font-montserrat">Your story starts at the next one.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-montserrat px-1">
              {past.length} R@ll{past.length === 1 ? 'y' : 'ies'} in the archive — tap any to relive the recap.
            </p>
            {past.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
