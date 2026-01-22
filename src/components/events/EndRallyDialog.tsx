import { useState } from 'react';
import { Moon, Home, PartyPopper, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEndRally, useCompleteRally } from '@/hooks/useAfterRally';
import { toast } from 'sonner';

interface EndRallyDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EndRallyDialog({ eventId, open, onOpenChange }: EndRallyDialogProps) {
  const endRally = useEndRally();
  const completeRally = useCompleteRally();
  const [isLoading, setIsLoading] = useState(false);

  const handleAfterRally = async () => {
    setIsLoading(true);
    try {
      await endRally.mutateAsync(eventId);
      toast.success('After R@lly started! 🌙');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start After R@lly');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRally = async () => {
    setIsLoading(true);
    try {
      await completeRally.mutateAsync(eventId);
      toast.success('R@lly completed! 🎉');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete R@lly');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <span>End R@lly</span>
          </DialogTitle>
          <DialogDescription>
            What would you like to do with this R@lly?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Button
            variant="outline"
            className="w-full h-auto py-4 flex items-start gap-3 text-left"
            onClick={handleAfterRally}
            disabled={isLoading}
          >
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <Moon className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <div className="font-semibold font-montserrat">Start After R@lly</div>
              <p className="text-sm text-muted-foreground font-normal">
                Continue the night! Guests can choose to keep hanging or head home.
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full h-auto py-4 flex items-start gap-3 text-left"
            onClick={handleCompleteRally}
            disabled={isLoading}
          >
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <div className="font-semibold font-montserrat">Complete R@lly</div>
              <p className="text-sm text-muted-foreground font-normal">
                End the event now. Everyone's already home or leaving.
              </p>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
