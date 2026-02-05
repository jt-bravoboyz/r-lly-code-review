import { useState } from 'react';
import { Car, Users, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRallyOnboarding } from '@/contexts/RallyOnboardingContext';
import { useNavigate } from 'react-router-dom';

export function RallyRidesBanner() {
  const { state, progressToLocation, skipToLocation } = useRallyOnboarding();
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  // Only show when on rides step
  if (state.currentStep !== 'rides') {
    return null;
  }

  const handleDDSelect = () => {
    // Navigate to event with DD dialog trigger
    setIsExiting(true);
    setTimeout(() => {
      progressToLocation();
      // Navigate to event detail page - DD setup will be triggered there
      if (state.eventId) {
        navigate(`/events/${state.eventId}?openDD=true`);
      }
    }, 300);
  };

  const handleRiderSelect = () => {
    // Navigate to event with ride request dialog trigger
    setIsExiting(true);
    setTimeout(() => {
      progressToLocation();
      if (state.eventId) {
        navigate(`/events/${state.eventId}?openRideRequest=true`);
      }
    }, 300);
  };

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      skipToLocation();
    }, 300);
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm ${
        isExiting ? 'rally-onboarding-banner-exit' : 'rally-onboarding-banner'
      }`}
    >
      <div className="w-full max-w-md mx-4 bg-gradient-to-br from-card via-card to-secondary/30 rounded-3xl shadow-2xl overflow-hidden border border-border">
        {/* Step indicator */}
        <div className="flex justify-center gap-2 pt-4 pb-2">
          <div className="step-dot completed" />
          <div className="step-dot active" />
          <div className="step-dot" />
        </div>

        {/* Header */}
        <div className="px-6 pt-2 pb-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground font-montserrat mb-2">
            How are you getting there?
          </h2>
          <p className="text-muted-foreground text-sm">
            Help coordinate rides for the crew
          </p>
        </div>

        {/* Options */}
        <div className="px-6 pb-4 space-y-3">
          {/* DD Option */}
          <button
            onClick={handleDDSelect}
            className="w-full p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground font-montserrat">I'm the DD</h3>
                <p className="text-sm text-muted-foreground">Drive others home safely</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          {/* Rider Option */}
          <button
            onClick={handleRiderSelect}
            className="w-full p-4 rounded-2xl border-2 border-secondary/50 bg-secondary/10 hover:bg-secondary/20 hover:border-secondary transition-all group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-secondary/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="h-7 w-7 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground font-montserrat">I Need a Ride</h3>
                <p className="text-sm text-muted-foreground">Find a ride from the crew</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-secondary-foreground group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

        {/* Skip option */}
        <div className="px-6 pb-6">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full h-12 text-muted-foreground hover:text-foreground"
          >
            I'll figure it out later
          </Button>
        </div>
      </div>
    </div>
  );
}
