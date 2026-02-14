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
}: RidesSelectionModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  const [view, setView] = useState<View>('choice');
  const [showDDSetup, setShowDDSetup] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // Request ride state
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestRide = async () => {
    if (!profile) {
      toast.error('You must be logged in');
      return;
    }

    if (!pickupLocation.trim()) {
      toast.error('Please enter a pickup location');
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

      // Send notification to DDs
      try {
        await supabase.functions.invoke('send-event-notification', {
          body: {
            type: 'ride_request',
            eventId,
            targetProfileIds: recipientIds,
            excludeProfileId: profile.id,
            title: '🚗 New Ride Request!',
            body: `${profile.display_name || 'Someone'} needs a ride from ${pickupLocation}`,
            data: {
              event_id: eventId,
              pickup_location: pickupLocation,
              requester_id: profile.id,
              requester_name: profile.display_name,
              url: `/events/${eventId}`,
            },
          },
        });
      } catch (notifError) {
        console.error('Failed to send ride request notification:', notifError);
      }

      // Mark safety choice and ride need in attendee record
      await supabase
        .from('event_attendees')
        .update({ 
          not_participating_rally_home_confirmed: false,
          going_home_at: null,
          needs_ride: true,
          ride_requested_at: new Date().toISOString(),
          ride_pickup_location: pickupLocation.trim() || null,
          ride_pickup_lat: pickupCoords?.lat || null,
          ride_pickup_lng: pickupCoords?.lng || null,
        })
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      toast.success('Ride request sent! A R@lly DD will pick you up.', {
        icon: '🚗',
      });
      
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Show location modal instead of completing immediately
      onOpenChange(false);
      setShowLocationModal(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to request ride');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDDComplete = () => {
    setShowDDSetup(false);
    // Show location modal instead of completing immediately
    setShowLocationModal(true);
  };

  const handleLocationComplete = () => {
    setShowLocationModal(false);
    onComplete();
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      // Reset state when closing
      setView('choice');
      setPickupLocation('');
      setPickupCoords(null);
    }
    onOpenChange(openState);
  };

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
                  Where should we pick you up?
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pickup Location</label>
                  <LocationSearch
                    value={pickupLocation}
                    onChange={setPickupLocation}
                    onLocationSelect={(loc) => {
                      setPickupLocation(loc.name);
                      setPickupCoords({ lat: loc.lat, lng: loc.lng });
                    }}
                    placeholder="Enter pickup address..."
                    showMapPreview={false}
                  />
                </div>

                {pickupCoords && (
                  <LocationMapPreview
                    lat={pickupCoords.lat}
                    lng={pickupCoords.lng}
                    name="Pickup"
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
                  disabled={isSubmitting || !pickupLocation.trim()}
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
