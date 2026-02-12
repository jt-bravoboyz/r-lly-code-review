import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowRight, Plus, Bell, Sparkles, Clock, Calendar, History } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BottomNav } from '@/components/layout/BottomNav';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { PendingInvites } from '@/components/events/PendingInvites';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { QuickRallyDialog } from '@/components/events/QuickRallyDialog';
import { useAuth } from '@/hooks/useAuth';
import { useMyEvents } from '@/hooks/useMyEvents';
import { useUnreadCount } from '@/hooks/useNotifications';
import { usePendingInvites, useInviteRealtime } from '@/hooks/useEventInvites';
import { useRallyOnboarding } from '@/contexts/RallyOnboardingContext';
import rallyLogo from '@/assets/rally-logo.png';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const { data: categorizedEvents, isLoading: eventsLoading } = useMyEvents();
  const unreadCount = useUnreadCount();
  const { data: pendingInvites } = usePendingInvites();
  const { startOnboarding, state: onboardingState } = useRallyOnboarding();
  const totalUnread = unreadCount + (pendingInvites?.length || 0);

  // Subscribe to realtime invite updates
  useInviteRealtime();

  // Trigger onboarding banner when there's a pending invite and not already onboarding
  useEffect(() => {
    if (
      pendingInvites && 
      pendingInvites.length > 0 && 
      !onboardingState.isActive && 
      onboardingState.currentStep === 'idle'
    ) {
      // Start onboarding with the first pending invite
      startOnboarding(pendingInvites[0]);
    }
  }, [pendingInvites, onboardingState.isActive, onboardingState.currentStep, startOnboarding]);

  // Production mode - require authentication

  if (loading) {
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

  // Require authentication
  if (!user) {
    return <LandingScreen />;
  }

  const currentEvents = categorizedEvents?.current || [];
  const upcomingEvents = categorizedEvents?.upcoming || [];
  const pastEvents = categorizedEvents?.past || [];
  const userName = profile?.display_name || 'User';
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-b from-background via-background to-secondary/30 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-60 right-10 w-40 h-40 bg-yellow-400/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* Modern gradient header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-primary via-primary to-orange-500 shadow-lg shadow-primary/20">
        {/* Status bar placeholder */}
        <div className="h-6" />
        
        {/* Header content */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo with glow */}
          <div className="flex items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 rounded-full blur-md" />
              <img src={rallyLogo} alt="R@lly" className="h-11 w-11 object-contain relative filter drop-shadow-lg brightness-0 invert" />
            </div>
          </div>

          {/* Right side - notifications & avatar */}
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <Link to="/notifications" className="relative group">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-sm group-hover:bg-white/30 transition-all" />
              <Bell className="h-6 w-6 text-white relative" strokeWidth={2} />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] text-black font-bold shadow-lg animate-pulse">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </Link>
            
            {/* User avatar with ring */}
            <Link to="/profile" className="relative group">
              <div className="absolute inset-0 bg-white/30 rounded-full blur-sm scale-110" />
              <Avatar className="h-11 w-11 ring-2 ring-white/50 hover:ring-white transition-all relative shadow-lg">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-sm font-bold bg-white text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="px-4 py-6 space-y-8 relative z-10">

        {/* Pending R@lly Invites - Show prominently at top */}
        {(pendingInvites?.length ?? 0) > 0 && (
          <section className="space-y-3">
            <PendingInvites />
          </section>
        )}

        {/* Ready to Rally Section - Bold & Vibrant */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground font-montserrat tracking-tight">
              Ready to R@lly?
            </h2>
          </div>
          
          {/* Quick action cards - Bold gradient style */}
          <div className="grid grid-cols-2 gap-4">
            <CreateEventDialog
              trigger={
                <Card className="group bg-gradient-to-br from-white to-secondary/50 shadow-lg hover:shadow-xl rounded-2xl border-0 overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4 relative">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                      <Plus className="h-7 w-7 text-primary" strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-base text-foreground font-montserrat">Create Event</span>
                  </CardContent>
                </Card>
              }
            />
            
            <QuickRallyDialog 
              trigger={
                <Card className="group bg-gradient-to-br from-yellow-400 via-orange-400 to-primary shadow-lg hover:shadow-2xl hover:shadow-orange-500/30 rounded-2xl border-0 overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4 relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                    <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Zap className="h-8 w-8 text-white drop-shadow-lg" strokeWidth={2.5} fill="currentColor" />
                    </div>
                    <span className="font-extrabold text-base text-white font-montserrat drop-shadow-sm">Quick R@lly</span>
                  </CardContent>
                </Card>
              }
            />
          </div>
        </section>

        {/* Current/Live Events Section */}
        {currentEvents.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h3 className="text-xl font-bold text-foreground font-montserrat">Live Now</h3>
              </div>
              <Clock className="h-5 w-5 text-green-500" />
            </div>

            <div className="space-y-4">
              {currentEvents.map((event) => (
                <div key={event.id} className="relative">
                  <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500 to-green-400 rounded-full" />
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold text-foreground font-montserrat">Upcoming</h3>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80 font-bold font-montserrat hover:bg-primary/10">
              <Link to="/events" className="flex items-center gap-1">
                See All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="h-72 animate-pulse bg-gradient-to-r from-muted to-muted/50 border-0 rounded-2xl" />
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingEvents.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Card className="bg-gradient-to-br from-white to-secondary/30 shadow-lg rounded-2xl border-0 overflow-hidden">
              <CardContent className="p-8 text-center relative">
                <div className="absolute top-0 left-1/2 w-32 h-32 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mx-auto mb-4 flex items-center justify-center relative">
                  <Zap className="h-8 w-8 text-primary" strokeWidth={2} />
                </div>
                <h4 className="font-bold text-lg mb-2 text-foreground font-montserrat">No upcoming events</h4>
                <p className="text-sm text-muted-foreground mb-6 font-montserrat">Start one and rally your squad!</p>
                <QuickRallyDialog />
              </CardContent>
            </Card>
          )}
        </section>

        {/* Past Events Section */}
        {pastEvents.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-xl font-bold text-foreground font-montserrat">Past R@llies</h3>
            </div>
            </div>

            <div className="space-y-4 opacity-80">
              {pastEvents.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function LandingScreen() {
  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: "#121212" }}
    >
      {/* Radial gradient glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, rgba(255, 106, 0, 0.10) 0%, rgba(255, 106, 0, 0.04) 40%, transparent 70%)",
        }}
      />

      {/* Ambient glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-1/4 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: "#FF6A00" }}
        />
        <div 
          className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: "#FF6A00" }}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
        <div className="max-w-sm w-full space-y-8">
          {/* Logo wordmark */}
          <div className="relative">
            <h1 
              className="text-6xl font-extrabold font-montserrat tracking-tight animate-splash-logo-fade"
              style={{ 
                color: "rgba(255, 255, 255, 0.95)",
                textShadow: "0 0 60px rgba(255, 106, 0, 0.4)",
              }}
            >
              R@LLY
            </h1>
          </div>
          
          {/* Tagline */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span 
                className="text-2xl font-bold font-montserrat"
                style={{ color: "rgba(255, 255, 255, 0.85)" }}
              >
                Ready.
              </span>
              <span 
                className="text-2xl font-bold font-montserrat"
                style={{ color: "rgba(255, 255, 255, 0.85)" }}
              >
                Set.
              </span>
              <span 
                className="text-2xl font-extrabold font-montserrat"
                style={{ 
                  background: "linear-gradient(135deg, #FF6A00 0%, #FFB366 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                R@lly!
              </span>
            </div>
            <p 
              className="text-lg font-montserrat"
              style={{ color: "rgba(255, 255, 255, 0.60)" }}
            >
              Rally your squad in seconds
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="pt-8 space-y-3">
            <Button 
              asChild 
              size="lg" 
              className="w-full rounded-full text-lg h-14 font-bold font-montserrat transition-all hover:scale-[1.02] active:scale-[0.98] group"
              style={{
                background: "linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)",
                color: "#FFFFFF",
                boxShadow: "0 8px 32px rgba(255, 106, 0, 0.4)",
              }}
            >
              <Link to="/auth">
                Get Started 
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full rounded-full text-lg h-14 font-bold font-montserrat transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                borderColor: "rgba(255, 106, 0, 0.35)",
                color: "rgba(255, 255, 255, 0.90)",
              }}
            >
              <Link to="/auth/return">Log In</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
