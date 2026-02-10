import { useState } from 'react';
import { MapPin, Shield, Loader2, Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useLocationContext } from '@/contexts/LocationContext';
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
  const { startTracking } = useLocationContext();
  const [isLoading, setIsLoading] = useState(false);
  const [denied, setDenied] = useState(false);

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

  const requestPermissionAndStart = async () => {
    setIsLoading(true);
    setDenied(false);
    try {
      if (!navigator.geolocation) {
        await markPromptShown(false);
        toast.info("No worries—you can turn it on later in the Rally.", { icon: '📍' });
        onComplete();
        return;
      }

      let permissionGranted = false;

      try {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            () => { permissionGranted = true; resolve(); },
            (err) => {
              if (err.code === 1) {
                reject(err);
              } else {
                permissionGranted = true;
                resolve();
              }
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      } catch {
        permissionGranted = false;
      }

      if (permissionGranted) {
        await markPromptShown(true);
        startTracking(eventId);
        toast.success('Location sharing enabled! 📍', {
          description: 'Your squad can now see where you are.',
        });
        onComplete();
      } else {
        setDenied(true);
      }
    } catch (error) {
      console.error('Location permission error:', error);
      setDenied(true);
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

  const handleOpenSettings = () => {
    toast.info('Open your browser or device settings to allow location access for this site.', {
      duration: 5000,
    });
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
            {denied
              ? "Location is off. Turn it on to let the squad keep tabs."
              : "Share your live location to keep tabs on the squad—see where everyone's at and make sure nobody gets left behind."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          {denied ? (
            <>
              <Button
                className="w-full h-12 text-base gradient-primary"
                onClick={requestPermissionAndStart}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleOpenSettings}
              >
                <Settings className="h-4 w-4 mr-2" />
                Open Settings
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleNotNow}
                disabled={isLoading}
              >
                Skip for Now
              </Button>
            </>
          ) : (
            <>
              <Button
                className="w-full h-12 text-base gradient-primary"
                onClick={requestPermissionAndStart}
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
