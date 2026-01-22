import { Moon, Home, MapPin, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOptIntoAfterRally } from '@/hooks/useAfterRally';
import { useAuth } from '@/hooks/useAuth';
import { useMyRallyHomePrompt } from '@/hooks/useRallyHomePrompt';
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
  const promptStatus = useMyRallyHomePrompt(eventId);
  const { data: event } = useEvent(eventId);
  const { playAcceptSound } = useAfterRallyTransition();

  // Only show for undecided or those needing re-confirmation
  // If already participating or arrived safely, don't show this dialog
  const shouldShow = open && (promptStatus.isUndecided || promptStatus.needsReconfirmation);

  const handleJoinAfterRally = async () => {
    if (!profile) return;
    
    try {
      await optIn.mutateAsync({
        eventId,
        profileId: profile.id,
        optIn: true,
        locationName: (event as any)?.after_rally_location_name || undefined,
      });
      // Play celebratory sound
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
      onHeadHome?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  // If shouldn't show, close the dialog automatically
  if (open && !shouldShow) {
    onOpenChange(false);
    return null;
  }

  const afterRallyLocation = (event as any)?.after_rally_location_name;

  return (
    <Dialog open={shouldShow} onOpenChange={() => {
      // Don't allow closing without making a choice
      toast.info('Please choose your next step');
    }}>
      <DialogContent 
        className="max-w-sm after-rally-dialog border-[hsl(270,60%,50%)]/50" 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Moon className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-montserrat">After R@lly</span>
              <p className="text-white/70 text-sm font-normal">The night continues!</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Location Card */}
          {afterRallyLocation && (
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wide">Next Stop</p>
                  <p className="text-white font-semibold text-lg">{afterRallyLocation}</p>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-white/10 border border-white/20">
            <p className="text-white/80 text-sm text-center">
              <PartyPopper className="h-4 w-4 inline mr-2" />
              Everyone heading to After R@lly will be tracked for safety
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <Button
            onClick={handleJoinAfterRally}
            disabled={optIn.isPending}
            className="w-full bg-white text-[hsl(270,60%,30%)] hover:bg-white/90 font-semibold h-12 text-base"
          >
            <Moon className="h-5 w-5 mr-2" />
            I'm In!
          </Button>
          <Button
            variant="ghost"
            onClick={handleHeadHome}
            disabled={optIn.isPending}
            className="w-full text-white/80 hover:text-white hover:bg-white/10"
          >
            <Home className="h-4 w-4 mr-2" />
            I'm Heading Home
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
