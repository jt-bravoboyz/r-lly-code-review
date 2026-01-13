import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Home, User, Building2, MapPin, Navigation, CheckCircle2, Lock, Users, UserCheck, Globe, Shield, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMyAttendeeStatus, useUpdateSafetyStatus } from '@/hooks/useSafetyStatus';
import { useSafetyNotifications } from '@/hooks/useSafetyNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

export function RallyHomeButton({ eventId, trigger }: RallyHomeButtonProps) {
  const [showInitialChoice, setShowInitialChoice] = useState(false);
  const [open, setOpen] = useState(false);
  const [destinationType, setDestinationType] = useState<DestinationType>('home');
  const [customAddress, setCustomAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [visibility, setVisibility] = useState<VisibilityType>('squad');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [eventAttendees, setEventAttendees] = useState<EventAttendee[]>([]);
  const { profile } = useAuth();
  
  // Use the safety status hook
  const { data: myStatus, refetch: refetchStatus } = useMyAttendeeStatus(eventId);
  const { confirmNotParticipating } = useUpdateSafetyStatus();
  const { notifyGoingHome, notifyArrivedSafe } = useSafetyNotifications();

  // Derive state from myStatus
  const isGoingHome = !!myStatus?.going_home_at;
  const hasArrived = !!myStatus?.arrived_safely;
  const notParticipating = !!myStatus?.not_participating_rally_home_confirmed;

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

      const { error } = await supabase
        .from('event_attendees')
        .update({
          going_home_at: new Date().toISOString(),
          destination_name: finalAddress,
          destination_visibility: visibility,
          destination_shared_with: visibility === 'selected' ? selectedPeople : [],
          arrived_safely: false,
          arrived_at: null,
          // Also set after_rally_opted_in to true when participating
          after_rally_opted_in: true,
        } as any)
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      if (error) throw error;

      await refetchStatus();
      
      // Send notification to host/cohosts
      notifyGoingHome(eventId);
      
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
        className="w-full bg-muted text-muted-foreground rounded-full font-montserrat h-14 text-lg cursor-default"
      >
        <XCircle className="h-5 w-5 mr-2" />
        Not Participating in R@lly Home ✓
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

  // For undecided users - show initial choice dialog
  return (
    <>
      {/* Initial Choice Dialog */}
      <Dialog open={showInitialChoice} onOpenChange={setShowInitialChoice}>
        <DialogTrigger asChild>
          {trigger || (
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full font-montserrat h-14 text-lg shadow-lg shadow-orange-500/30">
              <Home className="h-5 w-5 mr-2" />
              R@lly Home
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-montserrat text-xl">
              <Shield className="h-6 w-6 text-secondary" />
              R@lly Home Safety
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Let your squad know your plans for getting home safely.
            </p>
            <Button
              className="w-full bg-secondary hover:bg-secondary/90 h-14"
              onClick={() => {
                setShowInitialChoice(false);
                setOpen(true);
              }}
            >
              <Navigation className="h-5 w-5 mr-2" />
              Participate in R@lly Home
            </Button>
            <Button
              variant="outline"
              className="w-full h-14"
              onClick={handleNotParticipating}
              disabled={isLoading}
            >
              <XCircle className="h-5 w-5 mr-2" />
              {isLoading ? 'Confirming...' : "I'm Not Participating in R@lly Home"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
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
                  Start Navigation
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
