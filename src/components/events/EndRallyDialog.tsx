import { useState } from 'react';
import { Moon, Home, CheckCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEndRally, useCompleteRally } from '@/hooks/useAfterRally';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LocationSearch } from '@/components/location/LocationSearch';

interface EndRallyDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

export function EndRallyDialog({ eventId, open, onOpenChange, onCompleted }: EndRallyDialogProps) {
  const endRally = useEndRally();
  const completeRally = useCompleteRally();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [locationSearchValue, setLocationSearchValue] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
    place_id?: string;
  } | null>(null);
  const [spotLabel, setSpotLabel] = useState('');
  const [showLocationError, setShowLocationError] = useState(false);

  const handleAfterRally = async () => {
    if (!selectedLocation) {
      setShowLocationError(true);
      return;
    }

    setIsLoading(true);
    try {
      const displayName = spotLabel.trim() || selectedLocation.name;

      const { error: updateError } = await supabase
        .from('events')
        .update({
          after_rally_location_name: displayName,
          after_rally_location_lat: selectedLocation.lat,
          after_rally_location_lng: selectedLocation.lng,
        })
        .eq('id', eventId);
      
      if (updateError) throw updateError;
      
      await endRally.mutateAsync(eventId);
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      toast.success('After R@lly started! 🌙', {
        description: `Location: ${displayName}`,
      });
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start After R@lly');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRally = async () => {
    setIsLoading(true);
    try {
      await completeRally.mutateAsync(eventId);
      onOpenChange(false);
      onCompleted?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete R@lly');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setLocationSearchValue('');
    setSelectedLocation(null);
    setSpotLabel('');
    setShowLocationError(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <span>End R@lly</span>
          </DialogTitle>
          <DialogDescription>
            What would you like to do with this R@lly?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 w-full min-w-0 overflow-hidden">
          {/* After R@lly Option with Location Picker */}
          <div className="p-3 rounded-lg border-2 border-[hsl(270,60%,70%)] bg-[hsl(270,60%,95%)] space-y-3 w-full min-w-0 box-border">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-[hsl(270,60%,50%)]/20 flex items-center justify-center shrink-0">
                <Moon className="h-4 w-4 text-[hsl(270,60%,50%)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold font-montserrat text-sm">Start After R@lly</div>
                <p className="text-xs text-muted-foreground">
                  Continue the night at a new spot!
                </p>
              </div>
            </div>
            
            {/* Location Search (mappable, required) */}
            <div className="space-y-2 w-full overflow-visible relative">
              <Label className="flex items-center gap-2 text-xs">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">After R@lly Spot</span>
                <span className="text-destructive shrink-0">*</span>
              </Label>
              <LocationSearch
                value={locationSearchValue}
                onChange={(v) => {
                  setLocationSearchValue(v);
                  setShowLocationError(false);
                  // If user clears or types new text, clear the selected location
                  if (selectedLocation && v !== selectedLocation.name) {
                    setSelectedLocation(null);
                  }
                }}
                onLocationSelect={(loc) => {
                  setSelectedLocation(loc);
                  setShowLocationError(false);
                }}
                placeholder="Search for a place or address..."
                showMapPreview={false}
                allowCustomName={false}
              />
              {showLocationError && (
                <p className="text-xs text-destructive">
                  Pick a place/address so the squad can map it.
                </p>
              )}
              {selectedLocation && (
                <p className="text-xs text-muted-foreground truncate">
                  📍 {selectedLocation.address}
                </p>
              )}
            </div>

            {/* Optional Label */}
            <div className="space-y-2 w-full overflow-hidden">
              <Label htmlFor="spotLabel" className="text-xs text-muted-foreground">
                Spot Name (optional)
              </Label>
              <Input
                id="spotLabel"
                placeholder="e.g., Josh's House, The Basement..."
                value={spotLabel}
                onChange={(e) => setSpotLabel(e.target.value)}
                className="text-sm"
              />
            </div>

            <Button
              className="w-full bg-[hsl(270,60%,50%)] hover:bg-[hsl(270,60%,40%)] text-white text-sm"
              onClick={handleAfterRally}
              disabled={isLoading || !selectedLocation}
            >
              <Moon className="h-4 w-4 mr-2" />
              Start After R@lly
            </Button>
          </div>

          {/* Complete Rally Option */}
          <Button
            variant="outline"
            className="w-full h-auto py-4 flex items-center gap-2 text-left"
            onClick={handleCompleteRally}
            disabled={isLoading}
          >
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold font-montserrat">Complete R@lly</div>
              <p className="text-xs text-muted-foreground font-normal">
                End the event—everyone's home safe.
              </p>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
