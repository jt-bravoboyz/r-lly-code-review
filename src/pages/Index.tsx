import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Car, ArrowRight, Navigation, Home as HomeIcon, Beer, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { EventCard } from '@/components/events/EventCard';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import rallyLogo from '@/assets/rally-logo.png';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();
  const [showSplash, setShowSplash] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Check if we've already shown splash this session
    const hasSeenSplash = sessionStorage.getItem('rally-splash-shown');
    if (hasSeenSplash) {
      setShowSplash(false);
      setShowContent(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('rally-splash-shown', 'true');
    setShowSplash(false);
    setTimeout(() => setShowContent(true), 100);
  };

  // Show splash screen on first visit (only for non-authenticated users)
  if (showSplash && !loading && !user) {
    return <SplashScreen onComplete={handleSplashComplete} duration={2800} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img 
            src={rallyLogo} 
            alt="R@lly" 
            className="w-20 h-20 object-contain animate-flag-wave"
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingScreen showContent={showContent} />;
  }

  const upcomingEvents = events?.slice(0, 3) || [];

  return (
    <div className="min-h-screen pb-24 bg-background">
      <Header />
      
      <main className="container py-6 space-y-6">
        {/* Welcome Section */}
        <section className="space-y-1 animate-slide-up-fade">
          <h2 className="text-2xl font-bold tracking-tight">
            What's the plan, {profile?.display_name || 'there'}?
          </h2>
          <p className="text-muted-foreground">Rally your crew</p>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3">
          <Link to="/events" className="animate-slide-up-fade stagger-1" style={{ opacity: 0 }}>
            <Card className="h-full card-rally group">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <span className="font-bold block">Start Rally</span>
                  <span className="text-xs text-muted-foreground">Create in seconds</span>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/rides" className="animate-slide-up-fade stagger-2" style={{ opacity: 0 }}>
            <Card className="h-full card-rally group">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
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
        <Card className="card-rally border-primary/30 bg-primary/5 animate-slide-up-fade stagger-3" style={{ opacity: 0 }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/15">
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
        <section className="space-y-4 animate-slide-up-fade stagger-4" style={{ opacity: 0 }}>
          <div className="flex items-center justify-between">
            <h3 className="section-title">Active Rallies</h3>
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
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
              {upcomingEvents.map((event, index) => (
                <div key={event.id} className={`animate-slide-up-fade stagger-${index + 1}`} style={{ opacity: 0 }}>
                  <EventCard event={event} />
                </div>
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

function LandingScreen({ showContent }: { showContent: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Radial glow behind logo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] gradient-radial opacity-60" />
        
        {/* Floating decorative elements */}
        <div className="absolute top-20 left-10 w-3 h-3 rounded-full bg-primary/30 animate-float" />
        <div className="absolute top-40 right-16 w-2 h-2 rounded-full bg-primary/40 animate-float-delayed" />
        <div className="absolute bottom-40 left-20 w-4 h-4 rounded-full bg-primary/20 animate-float" />
        <div className="absolute bottom-60 right-10 w-2 h-2 rounded-full bg-primary/30 animate-float-delayed" />
        
        {/* Animated ring */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-primary/10 animate-rotate-slow" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-primary/5 animate-rotate-slow" style={{ animationDirection: 'reverse', animationDuration: '30s' }} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
        <div className="max-w-sm w-full space-y-8">
          {/* Logo */}
          <div 
            className={`transition-all duration-700 ease-out ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
          >
            <div className="relative inline-block">
              <img 
                src={rallyLogo} 
                alt="R@lly" 
                className="w-32 h-32 mx-auto object-contain drop-shadow-2xl animate-bounce-gentle"
              />
              {/* Glow effect behind logo */}
              <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-primary/20 blur-2xl -z-10 animate-pulse-glow" />
            </div>
          </div>
          
          {/* Tagline */}
          <div 
            className={`space-y-3 transition-all duration-700 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <p className="text-2xl font-bold text-foreground">
              Plan fast. Stay synced.
            </p>
            <p className="text-lg text-muted-foreground">
              Rally your crew in seconds
            </p>
          </div>
          
          {/* Features */}
          <div 
            className={`grid grid-cols-2 gap-3 transition-all duration-700 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <FeatureCard 
              icon={<Zap className="h-5 w-5" />}
              title="Quick Rally"
              desc="Create in seconds"
              delay={0}
            />
            <FeatureCard 
              icon={<Beer className="h-5 w-5" />}
              title="Bar Hop"
              desc="Multiple stops"
              delay={1}
            />
            <FeatureCard 
              icon={<Navigation className="h-5 w-5" />}
              title="Live Tracking"
              desc="Find your crew"
              delay={2}
            />
            <FeatureCard 
              icon={<Car className="h-5 w-5" />}
              title="Rally Ride"
              desc="DD coordination"
              delay={3}
            />
          </div>

          {/* CTA Button */}
          <div 
            className={`pt-4 transition-all duration-700 delay-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <Button asChild size="lg" className="w-full btn-rally text-lg h-14 group">
              <Link to="/auth">
                Get Started 
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-2">
              <Sparkles className="h-3 w-3 text-primary" />
              Your crew is waiting
              <Sparkles className="h-3 w-3 text-primary" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay = 0 }: { icon: React.ReactNode; title: string; desc: string; delay?: number }) {
  return (
    <div 
      className="p-4 rounded-xl bg-card border border-border text-left group hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
      style={{ animationDelay: `${delay * 0.1}s` }}
    >
      <div className="text-primary mb-2 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="font-bold text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
