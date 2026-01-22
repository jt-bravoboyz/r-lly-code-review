import { useState } from 'react';
import { Home, Moon, Shield, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface RallyHomeOptInDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RallyHomeOptInDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange,
}: RallyHomeOptInDialogProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleParticipate = async () => {
    if (!profile) return;
    setIsSubmitting(true);

    try {
      // User will participate in R@lly Home - keep undecided status for now
      // They'll confirm their home time later
      const { error } = await supabase
        .from('event_attendees')
        .update({
          after_rally_opted_in: true,
          not_participating_rally_home_confirmed: null,
        })
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      if (error) throw error;

      toast.success("Great! We'll help you get home safely 🏠");
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save preference');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotParticipating = async () => {
    if (!profile) return;
    setIsSubmitting(true);

    try {
      // User is not participating in R@lly Home tracking
      const { error } = await supabase
        .from('event_attendees')
        .update({
          not_participating_rally_home_confirmed: true,
          after_rally_opted_in: false,
        })
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      if (error) throw error;

      toast.success('No problem! Have fun at the rally 🎉');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save preference');
    } finally {
      setIsSubmitting(false);
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
            <span>R@lly Home</span>
          </DialogTitle>
          <DialogDescription>
            Will you need help getting home safely from <span className="font-semibold text-foreground">{eventTitle}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Safety tracking</p>
              <p className="text-muted-foreground">We'll check in when you're heading home and make sure you arrive safely.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Car className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">DD coordination</p>
              <p className="text-muted-foreground">Connect with designated drivers at the event.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleParticipate}
            disabled={isSubmitting}
            className="w-full gradient-primary"
          >
            <Home className="h-4 w-4 mr-2" />
            Yes, Help Me Get Home Safe
          </Button>
          <Button
            variant="outline"
            onClick={handleNotParticipating}
            disabled={isSubmitting}
            className="w-full"
          >
            <Moon className="h-4 w-4 mr-2" />
            I'll Handle My Own Ride
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
