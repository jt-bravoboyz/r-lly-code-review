import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Home, User, Building2, MapPin, Navigation } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DestinationType = 'home' | 'friend' | 'hotel' | 'custom';

interface RallyHomeDialogProps {
  trigger?: React.ReactNode;
}

export function RallyHomeDialog({ trigger }: RallyHomeDialogProps) {
  const [open, setOpen] = useState(false);
  const [destinationType, setDestinationType] = useState<DestinationType>('home');
  const [customAddress, setCustomAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { profile, refreshProfile } = useAuth();

  const destinations = [
    { value: 'home', label: 'Home', icon: Home, address: profile?.home_address },
    { value: 'friend', label: "Friend's House", icon: User, address: null },
    { value: 'hotel', label: 'Hotel', icon: Building2, address: null },
    { value: 'custom', label: 'Custom', icon: MapPin, address: null },
  ];

  const handleGoHome = async () => {
    setIsLoading(true);
    
    try {
      let finalAddress = '';
      
      if (destinationType === 'home') {
        if (!profile?.home_address) {
          toast.error('Please set your home address in your profile first');
          setIsLoading(false);
          return;
        }
        finalAddress = profile.home_address;
      } else if (destinationType === 'custom' || destinationType === 'friend' || destinationType === 'hotel') {
        if (!customAddress.trim()) {
          toast.error('Please enter an address');
          setIsLoading(false);
          return;
        }
        finalAddress = customAddress.trim();
      }

      // Update user's current destination/status
      if (profile?.id) {
        // For now, we'll create a notification that the user is heading home
        await supabase.from('notifications').insert({
          profile_id: profile.id,
          type: 'rally_home',
          title: 'Heading Home',
          body: `You're heading to: ${finalAddress}`,
          data: { destination: finalAddress, destination_type: destinationType }
        });
      }

      toast.success(`You're heading ${destinationType === 'home' ? 'home' : 'to ' + finalAddress}!`, {
        description: 'Safe travels! 🏠',
        action: {
          label: 'Get Directions',
          onClick: () => {
            // Open in maps
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

  const needsAddress = destinationType !== 'home' || !profile?.home_address;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full bg-secondary hover:bg-secondary/90 rounded-full font-montserrat h-14 text-lg">
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
                    id={dest.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={dest.value}
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
