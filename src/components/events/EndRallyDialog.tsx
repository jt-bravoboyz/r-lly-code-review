import { useState } from 'react';
import { Moon, Home, PartyPopper, CheckCircle, MapPin } from 'lucide-react';
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
import { useEndRally, useCompleteRally } from '@/hooks/useAfterRally';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EndRallyDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EndRallyDialog({ eventId, open, onOpenChange }: EndRallyDialogProps) {
  const endRally = useEndRally();
  const completeRally = useCompleteRally();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [afterRallyLocation, setAfterRallyLocation] = useState('');
  const [showLocationError, setShowLocationError] = useState(false);

  const handleAfterRally = async () => {
    if (!afterRallyLocation.trim()) {
      setShowLocationError(true);
      return;
    }

    setIsLoading(true);
    try {
      // First set the after rally location on the event (using raw update for new column)
      const { error: updateError } = await supabase
        .from('events')
        .update({ after_rally_location_name: afterRallyLocation.trim() } as any)
        .eq('id', eventId);
      
      if (updateError) throw updateError;
      
      // Then transition to after_rally status
      await endRally.mutateAsync(eventId);
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      toast.success('After R@lly started! 🌙', {
        description: `Location: ${afterRallyLocation.trim()}`,
      });
      onOpenChange(false);
      setAfterRallyLocation('');
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
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm overflow-hidden">
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

        <div className="space-y-4 py-4 w-full min-w-0 overflow-hidden">
          {/* After R@lly Option with Location Input */}
          <div className="p-3 rounded-lg border-2 border-[hsl(270,60%,70%)] bg-[hsl(270,60%,95%)] space-y-3 w-full min-w-0 box-border">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-[hsl(270,60%,50%)]/20 flex items-center justify-center shrink-0">
                <Moon className="h-4 w-4 text-[hsl(270,60%,50%)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold font-montserrat text-sm">Start After R@lly</div>
                <p className="text-xs text-muted-foreground">
                  Continue the night at a new spot!
                </p>
              </div>
            </div>
            
            <div className="space-y-2 w-full overflow-hidden">
              <Label htmlFor="afterRallyLocation" className="flex items-center gap-2 text-xs">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">Where's the After R@lly?</span>
                <span className="text-destructive shrink-0">*</span>
              </Label>
              <Input
                id="afterRallyLocation"
                placeholder="e.g., Denny's, Jake's place..."
                value={afterRallyLocation}
                onChange={(e) => {
                  setAfterRallyLocation(e.target.value);
                  setShowLocationError(false);
                }}
                className={`text-sm ${showLocationError ? 'border-destructive' : ''}`}
              />
              {showLocationError && (
                <p className="text-xs text-destructive">Please enter the After R@lly location</p>
              )}
            </div>

            <Button
              className="w-full bg-[hsl(270,60%,50%)] hover:bg-[hsl(270,60%,40%)] text-white text-sm"
              onClick={handleAfterRally}
              disabled={isLoading}
            >
              <Moon className="h-4 w-4 mr-2" />
              Start After R@lly
            </Button>
          </div>

          {/* Complete Rally Option */}
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
