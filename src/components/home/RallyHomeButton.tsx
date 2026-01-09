import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Home, User, Building2, MapPin, Navigation, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DestinationType = 'home' | 'friend' | 'hotel' | 'custom';

interface RallyHomeButtonProps {
  eventId: string;
  trigger?: React.ReactNode;
}

export function RallyHomeButton({ eventId, trigger }: RallyHomeButtonProps) {
  const [open, setOpen] = useState(false);
  const [destinationType, setDestinationType] = useState<DestinationType>('home');
  const [customAddress, setCustomAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoingHome, setIsGoingHome] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);
  const { profile } = useAuth();

  // Check if user is already going home
  useEffect(() => {
    const checkStatus = async () => {
      if (!profile?.id) return;
      
      const { data } = await supabase
        .from('event_attendees')
        .select('going_home_at, arrived_home')
        .eq('event_id', eventId)
        .eq('profile_id', profile.id)
        .single();

      if (data) {
        setIsGoingHome(!!data.going_home_at);
        setHasArrived(!!data.arrived_home);
      }
    };

    checkStatus();
  }, [eventId, profile?.id]);

  const destinations = [
    { value: 'home', label: 'Home', icon: Home, address: profile?.home_address },
    { value: 'friend', label: "Friend's House", icon: User, address: null },
    { value: 'hotel', label: 'Hotel', icon: Building2, address: null },
    { value: 'custom', label: 'Custom', icon: MapPin, address: null },
  ];

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

      // Update attendee record with going home status
      const { error } = await supabase
        .from('event_attendees')
        .update({
          going_home_at: new Date().toISOString(),
          destination_name: finalAddress,
          arrived_home: false,
          arrived_at: null,
        })
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      if (error) throw error;

      setIsGoingHome(true);
      toast.success(`You're heading ${destinationType === 'home' ? 'home' : 'to ' + finalAddress}!`, {
        description: 'Your crew can track your journey 🏠',
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
          arrived_home: true,
          arrived_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('profile_id', profile.id);

      if (error) throw error;

      setHasArrived(true);
      toast.success('You made it! 🎉', {
        description: 'Your crew knows you arrived safely',
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const needsAddress = destinationType !== 'home' || !profile?.home_address;

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
        Safe at Home
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full font-montserrat h-14 text-lg shadow-lg shadow-orange-500/30">
            <Home className="h-5 w-5 mr-2" />
            I'm Going Home
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
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

          <div className="bg-secondary/10 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              📍 Your crew will be able to see when you arrive safely
            </p>
          </div>

          <Button
            className="w-full bg-primary hover:bg-primary/90 rounded-full font-montserrat h-12 text-base"
            onClick={handleGoHome}
            disabled={isLoading}
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
  );
}
