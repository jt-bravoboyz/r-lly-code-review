import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, Zap, Beer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRallyOnboarding } from '@/contexts/RallyOnboardingContext';
import { useRespondToInvite } from '@/hooks/useEventInvites';
import { useConfetti } from '@/hooks/useConfetti';
import { toast } from 'sonner';

export function RallyInviteBanner() {
  const { state, progressToRides, cancelOnboarding } = useRallyOnboarding();
  const respondToInvite = useRespondToInvite();
  const { fireRallyConfetti } = useConfetti();
  const [isExiting, setIsExiting] = useState(false);
  const [isResponding, setIsResponding] = useState(false);

  // Only show when on invite step
  if (state.currentStep !== 'invite' || !state.invite) {
    return null;
  }

  const { invite } = state;
  const event = invite.event;
  const inviter = invite.inviter;

  const handleAccept = async () => {
    setIsResponding(true);
    try {
      await respondToInvite.mutateAsync({
        inviteId: invite.id,
        eventId: invite.event_id,
        response: 'accepted',
      });
      
      // Fire confetti celebration
      fireRallyConfetti();
      
      toast.success("You're in! 🎉");
      
      // Small delay for confetti effect, then progress
      setTimeout(() => {
        progressToRides();
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to join rally');
      setIsResponding(false);
    }
  };

  const handleDecline = async () => {
    setIsResponding(true);
    try {
      await respondToInvite.mutateAsync({
        inviteId: invite.id,
        eventId: invite.event_id,
        response: 'declined',
      });
      
      setIsExiting(true);
      setTimeout(() => {
        cancelOnboarding();
      }, 300);
    } catch (error: any) {
      toast.error(error.message || 'Failed to decline invite');
      setIsResponding(false);
    }
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
          <div className="step-dot active" />
          <div className="step-dot" />
          <div className="step-dot" />
        </div>

        {/* Header */}
        <div className="px-6 pt-2 pb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Avatar className="h-10 w-10 border-2 border-primary/30">
              <AvatarImage src={inviter?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {inviter?.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
          <p className="text-muted-foreground text-sm">
            <span className="font-semibold text-foreground">{inviter?.display_name || 'Someone'}</span> invited you to:
          </p>
        </div>

        {/* Event details */}
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 border border-primary/20">
            <h2 className="text-2xl font-bold text-foreground font-montserrat text-center mb-4">
              {event?.title || 'A Rally'}
            </h2>

            <div className="space-y-3">
              {event?.start_time && (
                <div className="flex items-center gap-3 text-foreground">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">
                    {format(new Date(event.start_time), 'EEEE, MMM d · h:mm a')}
                  </span>
                </div>
              )}

              {event?.location_name && (
                <div className="flex items-center gap-3 text-foreground">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">{event.location_name}</span>
                </div>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 pt-2 justify-center">
                {event?.is_quick_rally && (
                  <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                    <Zap className="h-3 w-3 mr-1" />
                    Quick R@lly
                  </Badge>
                )}
                {event?.is_barhop && (
                  <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/30">
                    <Beer className="h-3 w-3 mr-1" />
                    Bar Hop
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 space-y-3">
          <Button
            onClick={handleAccept}
            disabled={isResponding}
            className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-primary via-primary to-orange-500 hover:opacity-90 text-white shadow-lg shadow-primary/30"
          >
            {isResponding ? 'Joining...' : "I'm In!"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDecline}
            disabled={isResponding}
            className="w-full h-12 text-muted-foreground hover:text-foreground"
          >
            Nah
          </Button>
        </div>
      </div>
    </div>
  );
}
