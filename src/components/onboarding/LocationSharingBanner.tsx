import { useState } from 'react';
import { MapPin, Shield, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRallyOnboarding } from '@/contexts/RallyOnboardingContext';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function LocationSharingBanner() {
  const { state, completeOnboarding } = useRallyOnboarding();
  const { getCurrentLocation } = useLocation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  // Only show when on location step
  if (state.currentStep !== 'location') {
    return null;
  }

  const handleShareLocation = async () => {
    if (!profile || !state.eventId) return;
    
    setIsEnabling(true);
    
    try {
      // Request browser location permission
      getCurrentLocation();
      
      // Update event_attendees to enable location sharing
      const { error } = await supabase
        .from('event_attendees')
        .update({ share_location: true })
        .eq('event_id', state.eventId)
        .eq('profile_id', profile.id);
      
      if (error) throw error;
      
      toast.success('Location sharing enabled! 📍', {
        description: 'Your crew can now find you',
      });
      
      // Complete and navigate
      setIsExiting(true);
      setTimeout(() => {
        completeOnboarding();
        navigate(`/events/${state.eventId}`);
      }, 300);
    } catch (error: any) {
      console.error('Failed to enable location sharing:', error);
      toast.error('Could not enable location sharing');
      setIsEnabling(false);
    }
  };

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      completeOnboarding();
      if (state.eventId) {
        navigate(`/events/${state.eventId}`);
      }
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
          <div className="step-dot completed" />
          <div className="step-dot active" />
        </div>

        {/* Header with icon */}
        <div className="px-6 pt-4 pb-2 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-orange-400/20 flex items-center justify-center mx-auto mb-4 relative">
            <MapPin className="h-10 w-10 text-primary" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center border-4 border-card">
              <Shield className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="px-6 pb-4 text-center">
          <h2 className="text-xl font-bold text-foreground font-montserrat mb-2">
            "It's important for troops to stick together"
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Share your location with the crew so everyone can find each other and stay safe.
          </p>
        </div>

        {/* Benefits */}
        <div className="px-6 pb-4">
          <div className="bg-primary/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-foreground">See where your friends are on the map</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-foreground">Coordinate meetups easily</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm text-foreground">R@lly Home safety tracking</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 space-y-3">
          <Button
            onClick={handleShareLocation}
            disabled={isEnabling}
            className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-primary via-primary to-orange-500 hover:opacity-90 text-white shadow-lg shadow-primary/30"
          >
            <MapPin className="h-5 w-5 mr-2" />
            {isEnabling ? 'Enabling...' : 'Share My Location'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isEnabling}
            className="w-full h-12 text-muted-foreground hover:text-foreground"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}
