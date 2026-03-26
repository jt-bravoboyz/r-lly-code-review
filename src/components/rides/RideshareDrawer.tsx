import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Car, Train, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

interface RideshareDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  profileId: string;
  destinationLat?: number;
  destinationLng?: number;
  destinationName?: string;
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function RideshareDrawer({
  open,
  onOpenChange,
  eventId,
  profileId,
  destinationLat,
  destinationLng,
  destinationName,
}: RideshareDrawerProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleProviderClick = async (
    provider: 'uber' | 'lyft' | 'public_transit',
    url: string
  ) => {
    setLoading(provider);
    try {
      // Write factual status to DB BEFORE opening link
      const transportMode = provider === 'public_transit' ? 'public_transit' : 'rideshare';
      await supabase
        .from('event_attendees')
        .update({
          departure_provider: provider,
          departure_transport_mode: transportMode,
          in_transit_rideshare_at: new Date().toISOString(),
        } as any)
        .eq('event_id', eventId)
        .eq('profile_id', profileId);

      trackEvent('rideshare_selected', { provider });

      // Open deep link using device-aware navigation
      if (isMobile()) {
        window.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      toast.success('Safe travels! 🏠');
      onOpenChange(false);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  const lat = destinationLat ?? 0;
  const lng = destinationLng ?? 0;
  const hasDestination = destinationLat != null && destinationLng != null;

  const uberUrl = `https://m.uber.com/looking?dropoff[latitude]=${lat}&dropoff[longitude]=${lng}`;
  const lyftUrl = `lyft://ridetype?id=lyft&destination[latitude]=${lat}&destination[longitude]=${lng}`;
  const transitUrl = isIOS()
    ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=r`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-montserrat">Request a Ride</DrawerTitle>
          <DrawerDescription>
            {hasDestination
              ? `Get home safely${destinationName ? ` — heading to ${destinationName}` : ''}`
              : 'Set a home address in your profile for pre-filled directions'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-3 pb-2">
          {/* Uber */}
          <Button
            variant="outline"
            className="w-full h-14 justify-start gap-3 text-left"
            disabled={!hasDestination || loading !== null}
            onClick={() => handleProviderClick('uber', uberUrl)}
          >
            {loading === 'uber' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                <Car className="h-4 w-4 text-white" />
              </div>
            )}
            <div>
              <p className="font-semibold">Open Uber</p>
              <p className="text-xs text-muted-foreground">Universal link — opens app or web</p>
            </div>
          </Button>

          {/* Lyft */}
          <Button
            variant="outline"
            className="w-full h-14 justify-start gap-3 text-left"
            disabled={!hasDestination || loading !== null}
            onClick={() => handleProviderClick('lyft', lyftUrl)}
          >
            {loading === 'lyft' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#FF00BF] flex items-center justify-center">
                <Car className="h-4 w-4 text-white" />
              </div>
            )}
            <div>
              <p className="font-semibold">Open Lyft</p>
              <p className="text-xs text-muted-foreground">Deep link — requires Lyft app</p>
            </div>
          </Button>

          {/* Public Transit */}
          <Button
            variant="outline"
            className="w-full h-14 justify-start gap-3 text-left"
            disabled={!hasDestination || loading !== null}
            onClick={() => handleProviderClick('public_transit', transitUrl)}
          >
            {loading === 'public_transit' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
                <Train className="h-4 w-4 text-white" />
              </div>
            )}
            <div>
              <p className="font-semibold">Public Transit</p>
              <p className="text-xs text-muted-foreground">
                {isIOS() ? 'Apple Maps' : 'Google Maps'} with transit directions
              </p>
            </div>
          </Button>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
