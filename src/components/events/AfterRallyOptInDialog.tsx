import { useEffect } from 'react';
import { Moon, Home, MapPin, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOptIntoAfterRally, useMyAfterRallyStatus } from '@/hooks/useAfterRally';
import { useAuth } from '@/hooks/useAuth';
import { useEvent } from '@/hooks/useEvents';
import { useAfterRallyTransition } from '@/hooks/useAfterRallyTransition';
import { toast } from 'sonner';

interface AfterRallyOptInDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHeadHome?: () => void;
}

export function AfterRallyOptInDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange,
  onHeadHome,
}: AfterRallyOptInDialogProps) {
  const { profile } = useAuth();
  const optIn = useOptIntoAfterRally();
  const { data: myStatus } = useMyAfterRallyStatus(eventId);
  const { data: event } = useEvent(eventId);
  const { playAcceptSound } = useAfterRallyTransition();

  // Show dialog if user hasn't opted in yet (regardless of R@lly Home status)
  // Don't show if already opted in or already arrived safely
  const hasOptedIn = myStatus?.after_rally_opted_in === true;
  const hasArrivedSafely = myStatus?.arrived_safely === true || !!myStatus?.dd_dropoff_confirmed_at;
  const shouldShow = open && !hasOptedIn && !hasArrivedSafely;

  // Close dialog via useEffect to avoid setState during render
  useEffect(() => {
    if (open && !shouldShow) {
      onOpenChange(false);
    }
  }, [open, shouldShow, onOpenChange]);

  const handleJoinAfterRally = async () => {
    if (!profile) return;
    
    try {
      await optIn.mutateAsync({
        eventId,
        profileId: profile.id,
        optIn: true,
        locationName: (event as any)?.after_rally_location_name || undefined,
      });
      // Play celebratory sound before the rainbow transition
      playAcceptSound();
      toast.success('You\'re in for After R@lly! 🌙');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to join After R@lly');
    }
  };

  const handleHeadHome = async () => {
    if (!profile) return;
    
    try {
      await optIn.mutateAsync({
        eventId,
        profileId: profile.id,
        optIn: false,
      });
      onOpenChange(false);
      // Trigger the R@lly Home flow for users who decline
      onHeadHome?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  // Don't render if shouldn't show
  if (!shouldShow) {
    return null;
  }

  const afterRallyLocation = (event as any)?.after_rally_location_name;

  // Dialog appears on NORMAL (white) screen - not the purple theme
  // Purple theme only applies after user clicks "I'm In!"
  return (
    <Dialog open={shouldShow} onOpenChange={() => {
      // Don't allow closing without making a choice
      toast.info('Please choose your next step');
    }}>
      <DialogContent 
        className="max-w-sm border-[hsl(270,60%,50%)]/30 bg-background" 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[hsl(270,60%,50%)]/20 flex items-center justify-center">
              <Moon className="h-6 w-6 text-[hsl(270,60%,50%)]" />
            </div>
            <div>
              <span className="text-xl font-montserrat">After R@lly</span>
              <p className="text-muted-foreground text-sm font-normal">The night continues!</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Location Card */}
          {afterRallyLocation && (
            <div className="p-4 rounded-xl bg-[hsl(270,60%,50%)]/10 border border-[hsl(270,60%,50%)]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(270,60%,50%)]/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-[hsl(270,60%,50%)]" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Next Stop</p>
                  <p className="font-semibold text-lg">{afterRallyLocation}</p>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-muted-foreground text-sm text-center">
              <PartyPopper className="h-4 w-4 inline mr-2" />
              Everyone heading to After R@lly will be tracked for safety
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:flex-col sm:justify-start items-stretch sm:space-x-0">
          <Button
            onClick={handleJoinAfterRally}
            disabled={optIn.isPending}
            className="w-full bg-[hsl(270,60%,50%)] hover:bg-[hsl(270,60%,40%)] text-white font-semibold h-12 text-base"
          >
            <Moon className="h-5 w-5 mr-2" />
            I'm In!
          </Button>
          <Button
            variant="outline"
            onClick={handleHeadHome}
            disabled={optIn.isPending}
            className="w-full ml-0.5"
          >
            <Home className="h-4 w-4 mr-2" />
            I'm Heading Home
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
