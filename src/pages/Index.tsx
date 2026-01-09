import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Car, ArrowRight, Home as HomeIcon, Plus, Calendar, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { EventCard } from '@/components/events/EventCard';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import rallyLogo from '@/assets/rally-logo.png';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();

  // For development: bypass auth check to see all screens
  const isDev = true; // Set to false to re-enable auth

  if (loading) {
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

  // Skip auth check in dev mode
  if (!user && !isDev) {
    return <LandingScreen />;
  }

  const upcomingEvents = events?.slice(0, 3) || [];
  const userName = profile?.display_name || 'Dev User';
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Custom header matching Figma */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        {/* Status bar placeholder */}
        <div className="h-6" />
        
        {/* Header content */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={rallyLogo} alt="R@lly" className="h-4 w-auto" />
            <div className="w-4 h-4 rounded-full bg-rally-cream flex items-center justify-center">
              <img src={rallyLogo} alt="" className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Right side - notifications & avatar */}
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <Link to="/notifications" className="relative">
              <Bell className="h-6 w-6 text-gray-600" strokeWidth={1.5} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[10px] text-white font-medium">
                3
              </span>
            </Link>
            
            {/* User avatar */}
            <Link to="/profile" className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-white">{userInitials}</span>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="px-4 py-6 space-y-6">
        {/* Ready to Rally Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-rally-dark font-montserrat">
            Ready to R@lly?
          </h2>
          
          {/* Quick action cards - matching Figma */}
          <div className="grid grid-cols-2 gap-4">
            <Link to="/events">
              <Card className="bg-white shadow-sm rounded-xl">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-rally-light flex items-center justify-center">
                    <Plus className="h-6 w-6 text-primary" strokeWidth={2} />
                  </div>
                  <span className="font-bold text-sm text-rally-gray font-montserrat">Create Event</span>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/events">
              <Card className="bg-white shadow-sm rounded-xl">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-rally-light flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" strokeWidth={2} />
                  </div>
                  <span className="font-bold text-sm text-rally-gray font-montserrat">Quick Rally</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Upcoming Events Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-rally-dark font-montserrat">Upcoming Events</h3>
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80 font-medium font-montserrat">
              <Link to="/events">
                See All
              </Link>
            </Button>
          </div>

          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="h-72 animate-pulse bg-muted border-0 rounded-2xl" />
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Card className="bg-white shadow-sm rounded-2xl">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-rally-light mx-auto mb-4 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-bold mb-2 text-rally-dark font-montserrat">No upcoming events</h4>
                <p className="text-sm text-rally-gray mb-4 font-montserrat">Start one and rally your crew!</p>
                <Button asChild className="bg-primary hover:bg-primary/90 rounded-full font-montserrat">
                  <Link to="/events">Create Event</Link>
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

function LandingScreen() {
  return (
    <div className="min-h-screen flex flex-col bg-rally-cream overflow-hidden relative">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
        <div className="max-w-sm w-full space-y-8">
          {/* Logo */}
          <div>
            <div className="w-24 h-24 rounded-full bg-rally-cream border-4 border-primary/20 mx-auto flex items-center justify-center shadow-xl mb-4">
              <img 
                src={rallyLogo} 
                alt="R@lly" 
                className="w-14 h-14 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-rally-dark font-montserrat">R@LLY</h1>
          </div>
          
          {/* Tagline */}
          <div className="space-y-3">
            <p className="text-xl font-semibold text-rally-dark font-montserrat">
              Plan fast. Stay synced.
            </p>
            <p className="text-base text-rally-gray font-montserrat">
              Rally your crew in seconds
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-8">
            <Button asChild size="lg" className="w-full rounded-full bg-primary hover:bg-primary/90 text-white text-base h-12 font-medium font-montserrat shadow-lg">
              <Link to="/auth">
                Get Started 
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
