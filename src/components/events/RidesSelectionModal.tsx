import { useState } from 'react';
import { Car, Shield, Navigation, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LocationSearch } from '@/components/location/LocationSearch';
import { LocationMapPreview } from '@/components/location/LocationMapPreview';
import { DDSetupDialog } from '@/components/rides/DDSetupDialog';
import { LocationSharingModal } from '@/components/events/LocationSharingModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface RidesSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  onComplete: () => void;
  eventId: string;
  eventTitle: string;
  eventLocationName?: string;
  eventLocationLat?: number;
  eventLocationLng?: number;
  /** Skip location sharing prompt (e.g. when changing plan after initial setup) */
  skipLocationPrompt?: boolean;
  /** BUG-2: Event status for phase-aware labels */
  eventStatus?: string;
}

type View = 'choice' | 'request-ride';

export function RidesSelectionModal({
  open,
  onOpenChange,
  onBack,
  onComplete,
  eventId,
  eventTitle,
  eventLocationName,
  eventLocationLat,
  eventLocationLng,
  skipLocationPrompt = false,
  eventStatus,
}: RidesSelectionModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  const [view, setView] = useState<View>('choice');
  const [showDDSetup, setShowDDSetup] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // BUG-2: Phase-aware semantics
  const isPostEvent = eventStatus === 'after_rally' || eventStatus === 'completed';
  
  // Location state (pickup or dropoff depending on phase)
  const [locationValue, setLocationValue] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestRide = async () => {
    if (!profile) {
      toast.error('You must be logged in');
      return;
    }

    if (!locationValue.trim()) {
      toast.error(isPostEvent ? 'Please enter a drop off location' : 'Please enter a pickup location');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find DDs and drivers for this event
      const [{ data: ddAttendees }, { data: availableRides }] = await Promise.all([
        supabase
          .from('event_attendees')
          .select('profile_id')
          .eq('event_id', eventId)
          .eq('is_dd', true),
        supabase
          .from('rides')
          .select('driver_id')
          .eq('event_id', eventId)
          .eq('status', 'available'),
      ]);

      const ddIds = (ddAttendees || []).map((a: any) => a.profile_id).filter(Boolean) as string[];
      const driverIds = (availableRides || []).map((r: any) => r.driver_id).filter(Boolean) as string[];

      const recipientIds = Array.from(new Set([...ddIds, ...driverIds])).filter(
        (id) => id && id !== profile.id
      );

      // BUG-2: Phase-aware notification
      const notifBody = isPostEvent
        ? `${profile.display_name || 'Someone'} needs a ride to ${locationValue}`
        : `${profile.display_name || 'Someone'} needs a ride from ${locationValue}`;

      try {
        await supabase.functions.invoke('send-event-notification', {
          body: {
            type: 'ride_request',
            eventId,
            targetProfileIds: recipientIds,
            excludeProfileId: profile.id,
            title: '🚗 New Ride Request!',
            body: notifBody,
            data: {
              event_id: eventId,
              pickup_location: isPostEvent ? undefined : locationValue,
              dropoff_location: isPostEvent ? locationValue : undefined,
              requester_id: profile.id,
              requester_name: profile.display_name,
              url: `/events/${eventId}`,
            },
          },
        });
      } catch (notifError) {
        console.error('Failed to send ride request notification:', notifError);
      }

      // BUG-2: Save to correct columns based on phase
      const updatePayload: Record<string, any> = {
        not_participating_rally_home_confirmed: false,
        going_home_at: null,
        needs_ride: true,
        ride_requested_at: new Date().toISOString(),
      };

      if (isPostEvent) {
        updatePayload.ride_dropoff_location = locationValue.trim() || null;
        updatePayload.ride_dropoff_lat = locationCoords?.lat || null;
        updatePayload.ride_dropoff_lng = locationCoords?.lng || null;
      } else {
        updatePayload.ride_pickup_location = locationValue.trim() || null;
        updatePayload.ride_pickup_lat = locationCoords?.lat || null;
        updatePayload.ride_pickup_lng = locationCoords?.lng || null;
      }

      await supabase
        .from('event_attendees')
        .update(updatePayload)
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      toast.success('Ride request sent! A R@lly DD will pick you up.', {
        icon: '🚗',
      });
      
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      onOpenChange(false);
      if (skipLocationPrompt) {
        onComplete();
      } else {
        setShowLocationModal(true);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to request ride');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDDComplete = () => {
    setShowDDSetup(false);
    if (skipLocationPrompt) {
      onComplete();
    } else {
      setShowLocationModal(true);
    }
  };

  const handleLocationComplete = () => {
    setShowLocationModal(false);
    onComplete();
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setView('choice');
      setLocationValue('');
      setLocationCoords(null);
    }
    onOpenChange(openState);
  };

  // BUG-2: Phase-aware labels
  const locationLabel = isPostEvent ? 'Drop Off Location' : 'Pickup Location';
  const locationPlaceholder = isPostEvent ? 'Enter drop off address...' : 'Enter pickup address...';
  const locationDescription = isPostEvent
    ? 'Where should we take you?'
    : 'Where should we pick you up?';

  return (
    <>
      <Dialog open={open && !showDDSetup} onOpenChange={handleClose}>
        <DialogContent 
          className="max-w-sm max-h-[90vh] overflow-y-auto"
          hideCloseButton
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {view === 'choice' ? (
            <>
              <DialogHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Car className="h-8 w-8 text-primary" />
                </div>
                <DialogTitle className="text-xl font-bold font-montserrat">
                  R@LLY RIDES
                </DialogTitle>
                <DialogDescription className="text-base">
                  Choose how R@lly is getting you home safe
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-4">
                <Button
                  className="w-full h-24 text-base gradient-primary flex-col py-4"
                  onClick={() => setView('request-ride')}
                >
                  <Navigation className="h-5 w-5 mb-1" />
                  <span>Request a Ride</span>
                  <span className="text-xs opacity-80">Get picked up by a DD</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full h-24 text-base flex-col py-4 border-primary text-primary hover:bg-primary/10"
                  onClick={() => setShowDDSetup(true)}
                >
                  <Shield className="h-5 w-5 mb-1" />
                  <span>Become a DD</span>
                  <span className="text-xs text-muted-foreground">Drive your crew home safe</span>
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to safety choice
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-4"
                  onClick={() => setView('choice')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-xl font-bold font-montserrat pt-2">
                  Request a Ride
                </DialogTitle>
                <DialogDescription>
                  {locationDescription}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{locationLabel}</label>
                  <LocationSearch
                    value={locationValue}
                    onChange={setLocationValue}
                    onLocationSelect={(loc) => {
                      setLocationValue(loc.name);
                      setLocationCoords({ lat: loc.lat, lng: loc.lng });
                    }}
                    placeholder={locationPlaceholder}
                    showMapPreview={false}
                  />
                </div>

                {locationCoords && (
                  <LocationMapPreview
                    lat={locationCoords.lat}
                    lng={locationCoords.lng}
                    name={isPostEvent ? 'Drop Off' : 'Pickup'}
                    height="h-32"
                    interactive={false}
                  />
                )}

                <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
                  <span className="font-medium">Destination:</span> {eventTitle}
                </div>

                <Button 
                  className="w-full gradient-accent"
                  onClick={handleRequestRide}
                  disabled={isSubmitting || !locationValue.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4 mr-2" />
                      Request Ride
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DD Setup Dialog */}
      <DDSetupDialog
        eventId={eventId}
        eventLocationName={eventLocationName}
        eventLocationLat={eventLocationLat}
        eventLocationLng={eventLocationLng}
        open={showDDSetup}
        onOpenChange={setShowDDSetup}
        onComplete={handleDDComplete}
        mode="full"
      />

      {/* Location Sharing Modal - shows after rides setup */}
      <LocationSharingModal
        open={showLocationModal}
        onOpenChange={setShowLocationModal}
        eventId={eventId}
        onComplete={handleLocationComplete}
      />
    </>
  );
}
