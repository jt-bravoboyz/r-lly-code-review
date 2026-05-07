import { useState, useEffect, useCallback } from 'react';
import { Car, Shield, Navigation, ArrowLeft, Loader2, MapPin, Home, Sparkles, LocateFixed } from 'lucide-react';
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
import { RideshareDeepLinkButtons } from '@/components/rides/RideshareDeepLinkButtons';
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
  skipLocationPrompt?: boolean;
  eventStatus?: string;
}

type View = 'choice' | 'meeting-or-pickup' | 'destination-choice' | 'pickup-location' | 'locked-in';

const HYPE_QUOTES = [
  "Motion detected. The takeover begins now 🚀",
  "Secure the bag. Secure the ride. Secure the night 🔒",
  "YKYK. And now we know 😏",
  "Bet. The night is ours 🌙",
  "Vibe: Validated ✅",
  "Coordinate the chaos. Execute the plan 🎯",
  "Safe and sound? No. Safe and legendary 🌟",
  "Put the team on your back. It's light work 💪",
  "The pity party is over. Now let's go 🔥",
  "Main character energy activated 💫",
  "The horse is prepared for battle 🐎",
  "You're locked in twin 🔒",
  "Tonight's gonna be legendary 🌟",
  "Squad's riding together 🚗",
  "Safety first, fun always 🎉",
  "Your crew's got you 💪",
  "Let's make it a night to remember ✨",
  "All systems go 🚀",
];

function LockedInScreen({ onDone }: { onDone: () => void }) {
  const [quote] = useState(() => HYPE_QUOTES[Math.floor(Math.random() * HYPE_QUOTES.length)]);

  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-scale-in">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-fade-in">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <div className="text-center space-y-2 animate-fade-in">
        <h2 className="text-2xl font-bold font-montserrat text-foreground">
          LOCKED IN 🔒
        </h2>
        <p className="text-base text-muted-foreground font-montserrat italic">
          {quote}
        </p>
      </div>
    </div>
  );
}

function QuickPickupButton({ icon, label, sublabel, onClick }: { icon: React.ReactNode; label: string; sublabel: string; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      className="w-full h-28 text-base flex-col py-4 border-border hover:border-primary hover:bg-primary/5 transition-transform hover:scale-[1.02] active:scale-[0.97]"
      onClick={onClick}
    >
      {icon}
      <span className="font-montserrat font-bold">{label}</span>
      <span className="text-xs text-muted-foreground truncate max-w-full">{sublabel}</span>
    </Button>
  );
}

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
  
  const isPostEvent = eventStatus === 'after_rally' || eventStatus === 'completed';
  
  // Pickup/dropoff state
  const [meetingAtVenue, setMeetingAtVenue] = useState(false);
  const [locationValue, setLocationValue] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationValue, setDestinationValue] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMeetingAtVenue = () => {
    setMeetingAtVenue(true);
    // Use event location as pickup
    setLocationValue(eventLocationName || 'Event Location');
    setLocationCoords(
      eventLocationLat && eventLocationLng
        ? { lat: eventLocationLat, lng: eventLocationLng }
        : null
    );
    setView('destination-choice');
  };

  const handlePickMeUp = () => {
    setMeetingAtVenue(false);
    setView('pickup-location');
  };

  const handleRallyHome = () => {
    if (profile?.home_address) {
      setDestinationValue(profile.home_address);
      setDestinationCoords(
        profile.home_lat && profile.home_lng
          ? { lat: profile.home_lat, lng: profile.home_lng }
          : null
      );
    }
    submitRideRequest(profile?.home_address || 'Home', profile?.home_lat, profile?.home_lng);
  };

  const handleOtherLocation = () => {
    // For "other location", we'll use the existing destination-choice but with a text input
    // Actually, let's just submit with whatever pickup we have and skip destination for now
    // The destination is the event itself when going TO the event
    submitRideRequest();
  };

  const handlePickupConfirmed = () => {
    setView('destination-choice');
  };

  const submitRideRequest = useCallback(async (destName?: string, destLat?: number, destLng?: number) => {
    if (!profile) {
      toast.error('You must be logged in');
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

      const pickupDisplay = locationValue || eventLocationName || 'Event';
      const notifBody = isPostEvent
        ? `${profile.display_name || 'Someone'} needs a ride to ${destName || locationValue}`
        : `${profile.display_name || 'Someone'} needs a ride from ${pickupDisplay}`;

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
              pickup_location: isPostEvent ? undefined : pickupDisplay,
              dropoff_location: isPostEvent ? (destName || locationValue) : undefined,
              requester_id: profile.id,
              requester_name: profile.display_name,
              url: `/events/${eventId}`,
            },
          },
        });
      } catch (notifError) {
        console.error('Failed to send ride request notification:', notifError);
      }

      const updatePayload: Record<string, any> = {
        not_participating_rally_home_confirmed: false,
        going_home_at: null,
        needs_ride: true,
        ride_requested_at: new Date().toISOString(),
      };

      if (isPostEvent) {
        updatePayload.ride_dropoff_location = (destName || locationValue).trim() || null;
        updatePayload.ride_dropoff_lat = destLat || destinationCoords?.lat || null;
        updatePayload.ride_dropoff_lng = destLng || destinationCoords?.lng || null;
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

      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Show locked-in screen
      setView('locked-in');
    } catch (error: any) {
      toast.error(error.message || 'Failed to request ride');
    } finally {
      setIsSubmitting(false);
    }
  }, [profile, eventId, locationValue, locationCoords, destinationCoords, isPostEvent, eventLocationName, queryClient]);

  const handleLockedInDone = useCallback(() => {
    onOpenChange(false);
    if (skipLocationPrompt) {
      onComplete();
    } else {
      setShowLocationModal(true);
    }
  }, [onOpenChange, skipLocationPrompt, onComplete]);

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
      setDestinationValue('');
      setDestinationCoords(null);
      setMeetingAtVenue(false);
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
          {view === 'locked-in' ? (
            <LockedInScreen onDone={handleLockedInDone} />
          ) : view === 'choice' ? (
            <>
              <DialogHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Car className="h-8 w-8 text-primary" />
                </div>
                <DialogTitle className="text-xl font-bold font-montserrat">
                  R@LLY RIDES
                </DialogTitle>
                <DialogDescription className="text-base">
                  How should we get you home?
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-4">
                <Button
                  className="w-full h-24 text-base gradient-primary flex-col py-4 transition-transform hover:scale-[1.02] active:scale-[0.97]"
                  onClick={() => setView('meeting-or-pickup')}
                >
                  <Navigation className="h-5 w-5 mb-1" />
                  <span className="font-montserrat font-bold">Request a Ride</span>
                  <span className="text-xs opacity-80">Get picked up by a DD</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full h-24 text-base flex-col py-4 border-primary text-primary hover:bg-primary/10 transition-transform hover:scale-[1.02] active:scale-[0.97]"
                  onClick={() => setShowDDSetup(true)}
                >
                  <Shield className="h-5 w-5 mb-1" />
                  <span className="font-montserrat font-bold">Become a DD</span>
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
          ) : view === 'meeting-or-pickup' ? (
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
                  How are you getting there?
                </DialogTitle>
                <DialogDescription>
                  Let your DD know the plan
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-4">
                <Button
                  variant="outline"
                  className="w-full h-28 text-base flex-col py-4 border-border hover:border-primary hover:bg-primary/5 transition-transform hover:scale-[1.02] active:scale-[0.97]"
                  onClick={handleMeetingAtVenue}
                >
                  <MapPin className="h-6 w-6 mb-2 text-primary" />
                  <span className="font-montserrat font-bold">Meeting at their place</span>
                  <span className="text-xs text-muted-foreground">I'll get myself to the event</span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-28 text-base flex-col py-4 border-border hover:border-primary hover:bg-primary/5 transition-transform hover:scale-[1.02] active:scale-[0.97]"
                  onClick={handlePickMeUp}
                >
                  <Car className="h-6 w-6 mb-2 text-primary" />
                  <span className="font-montserrat font-bold">Pick me up</span>
                  <span className="text-xs text-muted-foreground">I need a ride to the event</span>
                </Button>
              </div>
            </>
          ) : view === 'pickup-location' ? (
            <>
              <DialogHeader>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-4"
                  onClick={() => setView('meeting-or-pickup')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-xl font-bold font-montserrat pt-2">
                  {isPostEvent ? 'Drop Off Location' : 'Pickup Location'}
                </DialogTitle>
                <DialogDescription>
                  {isPostEvent ? 'Where should we take you?' : 'Where should we pick you up?'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                {/* Quick-select buttons */}
                <div className="space-y-3">
                  <QuickPickupButton
                    icon={<LocateFixed className="h-6 w-6 mb-2 text-primary" />}
                    label="Current Location"
                    sublabel="Use your GPS position"
                    onClick={async () => {
                      if (!navigator.geolocation) {
                        toast.error('Location not available on this device');
                        return;
                      }
                      toast.loading('Getting your location...', { id: 'geo' });
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const { latitude, lng } = { latitude: pos.coords.latitude, lng: pos.coords.longitude };
                          setLocationCoords({ lat: latitude, lng });
                          // Reverse geocode via Mapbox
                          try {
                            const envToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
                            let token = envToken;
                            if (!token) {
                              const { data } = await supabase.functions.invoke('get-mapbox-token');
                              token = data?.token;
                            }
                            if (token) {
                              const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${latitude}.json?access_token=${token}&limit=1`);
                              const geo = await res.json();
                              const name = geo.features?.[0]?.place_name || `${latitude.toFixed(4)}, ${lng.toFixed(4)}`;
                              setLocationValue(name);
                            } else {
                              setLocationValue(`${latitude.toFixed(4)}, ${lng.toFixed(4)}`);
                            }
                          } catch {
                            setLocationValue(`${latitude.toFixed(4)}, ${lng.toFixed(4)}`);
                          }
                          toast.dismiss('geo');
                          toast.success('Location set!');
                        },
                        () => {
                          toast.dismiss('geo');
                          toast.error('Could not get your location');
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }}
                  />
                  {profile?.home_address && (
                    <QuickPickupButton
                      icon={<Home className="h-6 w-6 mb-2 text-primary" />}
                      label="Home"
                      sublabel={profile.home_address.substring(0, 40)}
                      onClick={() => {
                        setLocationValue(profile.home_address!);
                        if (profile.home_lat && profile.home_lng) {
                          setLocationCoords({ lat: profile.home_lat, lng: profile.home_lng });
                        }
                      }}
                    />
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-x-0 top-0 flex items-center justify-center -mt-1">
                    <span className="bg-background px-2 text-xs text-muted-foreground">or search</span>
                  </div>
                </div>

                <LocationSearch
                  value={locationValue}
                  onChange={setLocationValue}
                  onLocationSelect={(loc) => {
                    setLocationValue(loc.name);
                    setLocationCoords({ lat: loc.lat, lng: loc.lng });
                  }}
                  placeholder={isPostEvent ? 'Enter drop off address...' : 'Enter pickup address...'}
                  showMapPreview={false}
                />

                {locationCoords && (
                  <LocationMapPreview
                    lat={locationCoords.lat}
                    lng={locationCoords.lng}
                    name={isPostEvent ? 'Drop Off' : 'Pickup'}
                    height="h-32"
                    interactive={false}
                  />
                )}

                <Button
                  className="w-full gradient-primary font-montserrat font-bold transition-transform active:scale-[0.97]"
                  onClick={handlePickupConfirmed}
                  disabled={!locationValue.trim()}
                >
                  Continue
                </Button>
              </div>
            </>
          ) : view === 'destination-choice' ? (
            <>
              <DialogHeader>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-4"
                  onClick={() => setView(meetingAtVenue ? 'meeting-or-pickup' : 'pickup-location')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-xl font-bold font-montserrat pt-2">
                  Where are you headed after?
                </DialogTitle>
                <DialogDescription>
                  So your DD knows the plan
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-4">
                <Button
                  variant="outline"
                  className="w-full h-28 text-base flex-col py-4 border-border hover:border-primary hover:bg-primary/5 transition-transform hover:scale-[1.02] active:scale-[0.97]"
                  onClick={handleRallyHome}
                  disabled={isSubmitting}
                >
                  <Home className="h-6 w-6 mb-2 text-primary" />
                  <span className="font-montserrat font-bold">R@lly Home</span>
                  <span className="text-xs text-muted-foreground">
                    {profile?.home_address ? profile.home_address.substring(0, 40) : 'Use your saved home address'}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-28 text-base flex-col py-4 border-border hover:border-primary hover:bg-primary/5 transition-transform hover:scale-[1.02] active:scale-[0.97]"
                  onClick={handleOtherLocation}
                  disabled={isSubmitting}
                >
                  <MapPin className="h-6 w-6 mb-2 text-primary" />
                  <span className="font-montserrat font-bold">Other Location</span>
                  <span className="text-xs text-muted-foreground">Going somewhere else after</span>
                </Button>

                {isSubmitting && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </>
          ) : null}
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

      {/* Location Sharing Modal */}
      <LocationSharingModal
        open={showLocationModal}
        onOpenChange={setShowLocationModal}
        eventId={eventId}
        onComplete={handleLocationComplete}
      />
    </>
  );
}
