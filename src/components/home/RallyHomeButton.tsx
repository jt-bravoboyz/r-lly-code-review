import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Home, User, Building2, MapPin, Navigation, CheckCircle2, Lock, Users, UserCheck, Globe, Shield, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMyAttendeeStatus, useUpdateSafetyStatus } from '@/hooks/useSafetyStatus';
import { useSafetyNotifications } from '@/hooks/useSafetyNotifications';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RidePlanCard } from './RidePlanCard';
import { RidesSelectionModal } from '@/components/events/RidesSelectionModal';
import { SafetyChoiceModal } from '@/components/events/SafetyChoiceModal';

type DestinationType = 'home' | 'friend' | 'hotel' | 'custom';
type VisibilityType = 'none' | 'squad' | 'selected' | 'all';

interface EventAttendee {
  profile_id: string;
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface RallyHomeButtonProps {
  eventId: string;
  trigger?: React.ReactNode;
  eventStatus?: string;
  autoOpen?: boolean;
  onAutoOpenComplete?: () => void;
  eventTitle?: string;
  eventLocationName?: string;
  eventLocationLat?: number;
  eventLocationLng?: number;
}

export function RallyHomeButton({ eventId, trigger, eventStatus, autoOpen, onAutoOpenComplete, eventTitle, eventLocationName, eventLocationLat, eventLocationLng }: RallyHomeButtonProps) {
  const [showInitialChoice, setShowInitialChoice] = useState(false); // kept for handleNotParticipating
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showSafetyChoice, setShowSafetyChoice] = useState(false);
  const [open, setOpen] = useState(false);
  const [destinationType, setDestinationType] = useState<DestinationType>('home');
  const [customAddress, setCustomAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [visibility, setVisibility] = useState<VisibilityType>('squad');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [eventAttendees, setEventAttendees] = useState<EventAttendee[]>([]);
  const { profile } = useAuth();
  const { token: mapboxToken } = useMapboxToken();
  
  // Use the safety status hook
  const { data: myStatus, refetch: refetchStatus } = useMyAttendeeStatus(eventId);
  const { confirmNotParticipating } = useUpdateSafetyStatus();
  const { notifyGoingHome, notifyArrivedSafe, notifyCarGroupRallyHome } = useSafetyNotifications();
  
  // Geocode an address to get coordinates
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!mapboxToken) return null;
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
    }
    return null;
  };

  // Derive state from myStatus
  const isGoingHome = !!myStatus?.going_home_at;
  const hasArrived = !!myStatus?.arrived_safely;
  const notParticipating = !!myStatus?.not_participating_rally_home_confirmed;
  const hasDestinationSet = !!(myStatus as any)?.destination_name && (myStatus as any)?.after_rally_opted_in;
  const isEventOver = eventStatus === 'after_rally' || eventStatus === 'completed';
  // A ride plan is "set" if the user completed the onboarding flow (location_prompt_shown)
  // OR explicitly chose DD/rider. This prevents re-prompting on every R@lly Home click.
  const hasRidePlan = !!(myStatus?.is_dd || myStatus?.needs_ride || myStatus?.location_prompt_shown);

  // Auto-open when autoOpen prop is set
  useEffect(() => {
    if (autoOpen && !isGoingHome && !hasArrived && !notParticipating) {
      if (hasDestinationSet && isEventOver) {
        // Already has destination, no need to show dialog
      } else if (hasRidePlan && !hasDestinationSet) {
        // Has ride plan but no destination - open destination dialog
        setOpen(true);
      } else if (!hasRidePlan) {
        // No ride plan at all - show safety choice
        setShowSafetyChoice(true);
      }
      onAutoOpenComplete?.();
    }
  }, [autoOpen]);

  // Fetch event attendees for "selected" option
  useEffect(() => {
    const fetchAttendees = async () => {
      if (!profile?.id) return;
      
      const { data } = await supabase
        .from('event_attendees')
        .select(`
          profile_id,
          profile:profiles(id, display_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .neq('profile_id', profile.id);

      if (data) {
        setEventAttendees(data as unknown as EventAttendee[]);
      }
    };

    if (open) {
      fetchAttendees();
    }
  }, [eventId, profile?.id, open]);

  const destinations = [
    { value: 'home', label: 'Home', icon: Home, address: profile?.home_address },
    { value: 'friend', label: "Friend's House", icon: User, address: null },
    { value: 'hotel', label: 'Hotel', icon: Building2, address: null },
    { value: 'custom', label: 'Custom', icon: MapPin, address: null },
  ];

  const visibilityOptions = [
    { value: 'none', label: 'Only Me', icon: Lock, description: 'Keep destination private' },
    { value: 'squad', label: 'My Squad', icon: Users, description: 'Squad members only' },
    { value: 'selected', label: 'Select People', icon: UserCheck, description: 'Choose specific people' },
    { value: 'all', label: 'All Attendees', icon: Globe, description: 'Everyone at this event' },
  ];

  const handleNotParticipating = async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    
    try {
      await confirmNotParticipating(eventId);
      setShowInitialChoice(false);
      await refetchStatus();
      toast.success("Got it! You're not participating in R@lly Home.", {
        description: 'Stay safe! 🙌',
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoHome = async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    
    try {
      let finalAddress = '';
      
      if (destinationType === 'home') {
        if (!profile?.home_address) {
          if (!customAddress.trim()) {
            toast.error('Please enter your home address');
            setIsLoading(false);
            return;
          }
          finalAddress = customAddress.trim();
        } else {
          finalAddress = profile.home_address;
        }
      } else {
        if (!customAddress.trim()) {
          toast.error('Please enter an address');
          setIsLoading(false);
          return;
        }
        finalAddress = customAddress.trim();
      }

      // Geocode the address to get coordinates for auto-arrival detection
      const coords = await geocodeAddress(finalAddress);

      const { error } = await supabase
        .from('event_attendees')
        .update({
          // Only set going_home_at if event is over - otherwise just save destination
          going_home_at: isEventOver ? new Date().toISOString() : null,
          destination_name: finalAddress,
          destination_lat: coords?.lat || null,
          destination_lng: coords?.lng || null,
          destination_visibility: visibility,
          destination_shared_with: visibility === 'selected' ? selectedPeople : [],
          arrived_safely: false,
          arrived_at: null,
          // Mark as opted-in regardless of event status
          after_rally_opted_in: true,
        } as any)
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      if (error) throw error;

      await refetchStatus();
      
      // Different behavior based on event phase
      if (isEventOver) {
        // Send notification to host/cohosts - only when actually departing
        notifyGoingHome(eventId);
        // Notify car group members
        notifyCarGroupRallyHome(eventId);
        
        const visibilityMessage = visibility === 'none' 
          ? 'Your destination is private' 
          : visibility === 'squad' 
            ? 'Your squad can see your destination' 
            : visibility === 'selected' 
              ? `${selectedPeople.length} people can see your destination`
              : 'All attendees can see your destination';
        
        toast.success(`You're heading ${destinationType === 'home' ? 'home' : 'to ' + finalAddress}!`, {
          description: visibilityMessage + ' 🏠',
          action: {
            label: 'Get Directions',
            onClick: () => {
              const encodedAddress = encodeURIComponent(finalAddress);
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
            }
          }
        });
      } else {
        // Event not over yet - just save destination
        toast.success('Destination saved! ✓', {
          description: "We'll remind you when it's time to head home 🏠",
        });
      }
      
      setOpen(false);
      setCustomAddress('');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArrived = async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({
          arrived_safely: true,
          arrived_at: new Date().toISOString(),
        } as any)
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      if (error) throw error;

      // MED-4: Guard against duplicate point awarding
      if (!myStatus?.arrived_safely) {
        try {
          await supabase.rpc('rly_award_points_by_profile', {
            p_profile_id: profile.id,
            p_event_type: 'safe_arrival',
            p_source_id: eventId
          });
        } catch (pointsError) {
          console.error('Failed to award safe_arrival points:', pointsError);
        }
      }

      await refetchStatus();
      
      // Send notification to host/cohosts/squad
      notifyArrivedSafe(eventId);
      
      toast.success('You made it! 🎉', {
        description: 'Your squad knows you arrived safely',
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePersonSelection = (profileId: string) => {
    setSelectedPeople(prev => 
      prev.includes(profileId) 
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  const needsAddress = destinationType !== 'home' || !profile?.home_address;

  // Show disabled state if not participating
  if (notParticipating) {
    return (
      <Button
        disabled
        className="bg-muted text-muted-foreground rounded-full font-montserrat h-8 text-xs px-4 cursor-default"
      >
        <XCircle className="h-3 w-3 mr-1" />
        Not Participating ✓
      </Button>
    );
  }

  // Show "I've Arrived" button if already going home
  if (isGoingHome && !hasArrived) {
    return (
      <Button
        onClick={handleArrived}
        disabled={isLoading}
        className="w-full bg-green-500 hover:bg-green-600 rounded-full font-montserrat h-14 text-lg"
      >
        <CheckCircle2 className="h-5 w-5 mr-2" />
        {isLoading ? 'Updating...' : "I've Arrived Safely"}
      </Button>
    );
  }

  // Show completed state
  if (hasArrived) {
    return (
      <Button
        disabled
        className="w-full bg-green-500/20 text-green-700 rounded-full font-montserrat h-14 text-lg cursor-default"
      >
        <CheckCircle2 className="h-5 w-5 mr-2" />
        Arrived Safely ✓
      </Button>
    );
  }

  // NEW: Show "Destination Set" state OR "Start Heading Home" button
  if (hasDestinationSet && !isGoingHome && !hasArrived && !notParticipating) {
    if (isEventOver) {
      // Event is over - show "Start Heading Home Now" button
      const handleStartJourney = async () => {
        if (!profile?.id) return;
        setIsLoading(true);
        
        try {
          const { error } = await supabase
            .from('event_attendees')
            .update({
              going_home_at: new Date().toISOString(),
            } as any)
            .eq('event_id', eventId)
            .eq('profile_id', profile.id);

          if (error) throw error;

          await refetchStatus();
          
          // Now notify that we're heading home
          notifyGoingHome(eventId);
          // Notify car group members
          notifyCarGroupRallyHome(eventId);
          
          const destinationName = (myStatus as any)?.destination_name || 'your destination';
          toast.success(`You're heading to ${destinationName}!`, {
            description: 'Safe travels! 🏠',
            action: {
              label: 'Get Directions',
              onClick: () => {
                const encodedAddress = encodeURIComponent(destinationName);
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
              }
            }
          });
        } catch (error) {
          console.error('Error:', error);
          toast.error('Something went wrong');
        } finally {
          setIsLoading(false);
        }
      };
      
      return (
        <Button
          onClick={handleStartJourney}
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-montserrat h-14 text-lg shadow-lg"
        >
          <Navigation className="h-5 w-5 mr-2" />
          {isLoading ? 'Starting...' : "I'm Heading Home Now"}
        </Button>
      );
    } else {
      // Event not over yet - show "Destination Set" status
      return (
        <Button
          disabled
          className="w-full bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full font-montserrat h-14 text-lg cursor-default"
        >
          <Shield className="h-5 w-5 mr-2" />
          Destination Set ✓
        </Button>
      );
    }
  }

  // For undecided users - show ride plan card (if plan exists) or safety choice
  const handleChangePlanComplete = () => {
    setShowChangePlan(false);
    refetchStatus();
  };

  const handleSafetyRallyGotMe = () => {
    setShowSafetyChoice(false);
    setShowChangePlan(true);
  };

  const handleSafetyImGood = async () => {
    // Mark as self-transport (not needing rally rides, not a DD)
    // Also mark location_prompt_shown so they don't get re-prompted
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      await supabase
        .from('event_attendees')
        .update({
          needs_ride: false,
          is_dd: false,
          location_prompt_shown: true,
        } as any)
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);
      
      await refetchStatus();
      setShowSafetyChoice(false);
      toast.success('Got it! You\'re getting home on your own.', {
        description: 'You can change this anytime.',
      });
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Show ride plan card if user already has a plan from join flow */}
      {hasRidePlan && myStatus ? (
        <div className="space-y-3">
          <RidePlanCard
            myStatus={myStatus}
            eventId={eventId}
            onChangePlan={() => setShowChangePlan(true)}
            onSetDestination={() => setOpen(true)}
            hasDestination={hasDestinationSet}
            eventStatus={eventStatus}
          />
          {!hasDestinationSet && (
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-montserrat h-14 text-lg shadow-lg"
              onClick={() => setOpen(true)}
            >
              <Navigation className="h-5 w-5 mr-2" />
              Set R@lly Home Destination
            </Button>
          )}
        </div>
      ) : (
        /* No ride plan set yet - show trigger button that opens safety choice */
        <>
          {trigger ? (
            <div onClick={() => setShowSafetyChoice(true)}>{trigger}</div>
          ) : (
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-montserrat h-14 text-lg shadow-lg"
              onClick={() => setShowSafetyChoice(true)}
            >
              <Home className="h-5 w-5 mr-2" />
              R@lly Home
            </Button>
          )}
        </>
      )}

      {/* Safety Choice Modal - for users who haven't set a plan */}
      <SafetyChoiceModal
        open={showSafetyChoice}
        onOpenChange={setShowSafetyChoice}
        onRallyGotMe={handleSafetyRallyGotMe}
        onDoingItMyself={handleSafetyImGood}
        isLoading={isLoading}
      />

      {/* Change Plan Modal - reuses RidesSelectionModal, skips location prompt */}
      <RidesSelectionModal
        open={showChangePlan}
        onOpenChange={setShowChangePlan}
        onBack={() => setShowChangePlan(false)}
        onComplete={handleChangePlanComplete}
        eventId={eventId}
        eventTitle={eventTitle || 'Rally'}
        eventLocationName={eventLocationName}
        eventLocationLat={eventLocationLat}
        eventLocationLng={eventLocationLng}
        skipLocationPrompt={true}
        eventStatus={eventStatus}
      />

      {/* Destination Selection Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-montserrat text-xl">
              <Navigation className="h-6 w-6 text-primary" />
              R@lly Home
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <Label className="font-montserrat text-base mb-3 block">Where are you heading?</Label>
              <RadioGroup
                value={destinationType}
                onValueChange={(v) => setDestinationType(v as DestinationType)}
                className="grid grid-cols-2 gap-3"
              >
                {destinations.map((dest) => (
                  <div key={dest.value}>
                    <RadioGroupItem
                      value={dest.value}
                      id={`home-${dest.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`home-${dest.value}`}
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                    >
                      <dest.icon className="h-6 w-6 mb-2 text-primary" />
                      <span className="text-sm font-medium">{dest.label}</span>
                      {dest.value === 'home' && profile?.home_address && (
                        <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-full">
                          {profile.home_address.slice(0, 20)}...
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {needsAddress && destinationType !== 'home' && (
              <div>
                <Label htmlFor="address" className="font-montserrat">
                  {destinationType === 'friend' ? "Friend's Address" : 
                   destinationType === 'hotel' ? 'Hotel Address' : 'Destination Address'}
                </Label>
                <Input
                  id="address"
                  placeholder="Enter address..."
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="mt-2"
                />
              </div>
            )}

            {destinationType === 'home' && !profile?.home_address && (
              <div className="bg-accent/50 border border-accent rounded-lg p-3">
                <p className="text-sm text-accent-foreground">
                  You haven't set your home address yet. Add it in your profile for one-tap access!
                </p>
                <Input
                  placeholder="Enter your home address..."
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="mt-2"
                />
              </div>
            )}

            {/* Privacy Settings */}
            <div>
              <Label className="font-montserrat text-base mb-3 block flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Who can see your destination?
              </Label>
              <RadioGroup
                value={visibility}
                onValueChange={(v) => setVisibility(v as VisibilityType)}
                className="space-y-2"
              >
                {visibilityOptions.map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={`visibility-${option.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`visibility-${option.value}`}
                      className="flex items-center gap-3 rounded-xl border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                    >
                      <option.icon className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{option.label}</span>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* People Selection */}
            {visibility === 'selected' && eventAttendees.length > 0 && (
              <div>
                <Label className="font-montserrat text-sm mb-2 block">
                  Select people ({selectedPeople.length} selected)
                </Label>
                <ScrollArea className="h-40 rounded-lg border p-2">
                  <div className="space-y-2">
                    {eventAttendees.map((attendee) => (
                      <div
                        key={attendee.profile_id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => togglePersonSelection(attendee.profile_id)}
                      >
                        <Checkbox
                          checked={selectedPeople.includes(attendee.profile_id)}
                          onCheckedChange={() => togglePersonSelection(attendee.profile_id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                            {attendee.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{attendee.profile?.display_name || 'Unknown'}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {visibility === 'selected' && eventAttendees.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No other attendees to select
              </p>
            )}

            <div className="bg-secondary/10 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                📍 {visibility === 'none' 
                  ? 'Only you will see your destination' 
                  : visibility === 'squad' 
                    ? 'Your squad members will see when you arrive safely'
                    : visibility === 'selected'
                      ? `${selectedPeople.length} selected people will see your destination`
                      : 'All event attendees will see your destination'}
              </p>
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/90 rounded-full font-montserrat h-12 text-base"
              onClick={handleGoHome}
              disabled={isLoading || (visibility === 'selected' && selectedPeople.length === 0)}
            >
              {isLoading ? 'Starting...' : (
                <>
                  <Navigation className="h-5 w-5 mr-2" />
                  {isEventOver ? 'Start Navigation' : 'Save Destination'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
