import { useState } from 'react';
import { MapPin, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LocationSharingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onComplete: () => void;
}

export function LocationSharingModal({
  open,
  onOpenChange,
  eventId,
  onComplete,
}: LocationSharingModalProps) {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const markPromptShown = async (shareLocation: boolean) => {
    if (!profile) return;

    const { error } = await supabase
      .from('event_attendees')
      .update({
        location_prompt_shown: true,
        share_location: shareLocation,
      })
      .eq('event_id', eventId)
      .eq('profile_id', profile.id);

    if (error) {
      console.error('Failed to update location prompt status:', error);
    }
  };

  const handleShareLocation = async () => {
    setIsLoading(true);
    try {
      // Request browser geolocation permission
      const result = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          () => resolve(null), // Permission denied or error
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });

      if (result) {
        // Permission granted - enable location sharing
        await markPromptShown(true);
        toast.success('Location sharing enabled! 📍', {
          description: 'Your squad can now see where you are.',
        });
      } else {
        // Permission denied
        await markPromptShown(false);
        toast.info("No worries—you can turn it on later in the Rally.", {
          icon: '📍',
        });
      }

      onComplete();
    } catch (error) {
      console.error('Location permission error:', error);
      await markPromptShown(false);
      toast.info("No worries—you can turn it on later in the Rally.", {
        icon: '📍',
      });
      onComplete();
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotNow = async () => {
    setIsLoading(true);
    try {
      await markPromptShown(false);
      onComplete();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm"
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 relative">
            <MapPin className="h-8 w-8 text-primary" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
              <Shield className="h-3 w-3 text-secondary-foreground" />
            </div>
          </div>
          <DialogTitle className="text-xl font-bold font-montserrat">
            NO MAN LEFT BEHIND
          </DialogTitle>
          <DialogDescription className="text-base">
            Share your live location with the squad so everybody gets home safe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          <Button
            className="w-full h-12 text-base gradient-primary"
            onClick={handleShareLocation}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enabling...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Share Location
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={handleNotNow}
            disabled={isLoading}
          >
            Not Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
