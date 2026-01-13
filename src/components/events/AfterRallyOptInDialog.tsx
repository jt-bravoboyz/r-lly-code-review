import { useState } from 'react';
import { Moon, Home, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOptIntoAfterRally } from '@/hooks/useAfterRally';
import { useAuth } from '@/hooks/useAuth';
import { useMyRallyHomePrompt } from '@/hooks/useRallyHomePrompt';
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
  const [locationName, setLocationName] = useState('');
  const { profile } = useAuth();
  const optIn = useOptIntoAfterRally();
  const promptStatus = useMyRallyHomePrompt(eventId);

  // Only show for undecided or those needing re-confirmation
  // If already participating or arrived safely, don't show this dialog
  const shouldShow = open && (promptStatus.isUndecided || promptStatus.needsReconfirmation);

  const handleContinue = async () => {
    if (!profile) return;
    
    try {
      await optIn.mutateAsync({
        eventId,
        profileId: profile.id,
        optIn: true,
        locationName: locationName || undefined,
      });
      toast.success('You\'re in for After R@lly! 🌙');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to opt in');
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

  return (
    <Dialog open={shouldShow} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
              <Moon className="h-5 w-5 text-secondary" />
            </div>
            <span>After R@lly</span>
          </DialogTitle>
          <DialogDescription>
            {promptStatus.needsReconfirmation 
              ? 'You opted into After R@lly! Please confirm your safety plans.'
              : 'The main event is wrapping up. What\'s next for you?'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Users className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">
              Continue hanging with your crew or head home safely.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Where are you heading? (optional)
            </Label>
            <Input
              id="location"
              placeholder="e.g., Denny's, Jake's place..."
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleContinue}
            disabled={optIn.isPending}
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            <Moon className="h-4 w-4 mr-2" />
            Continue the Night
          </Button>
          <Button
            variant="outline"
            onClick={handleHeadHome}
            disabled={optIn.isPending}
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            Head Home
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
