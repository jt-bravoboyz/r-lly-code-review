import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LocationSearch } from '@/components/location/LocationSearch';
import { useUpdateEvent } from '@/hooks/useEvents';
import { toast } from 'sonner';

interface EditEventLocationDialogProps {
  eventId: string;
  currentLocationName?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
}

export function EditEventLocationDialog({
  eventId,
  currentLocationName,
  currentLat,
  currentLng,
}: EditEventLocationDialogProps) {
  const [open, setOpen] = useState(false);
  const [locationName, setLocationName] = useState(currentLocationName || '');
  const [locationLat, setLocationLat] = useState<number | undefined>(currentLat ?? undefined);
  const [locationLng, setLocationLng] = useState<number | undefined>(currentLng ?? undefined);
  const updateEvent = useUpdateEvent();

  const handleSave = async () => {
    try {
      await updateEvent.mutateAsync({
        eventId,
        updates: {
          location_name: locationName || null,
          location_lat: locationLat ?? null,
          location_lng: locationLng ?? null,
        },
      });
      toast.success('📍 Location updated!');
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update location');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset to current values when opening
      setLocationName(currentLocationName || '');
      setLocationLat(currentLat ?? undefined);
      setLocationLng(currentLng ?? undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
          <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <LocationSearch
            value={locationName}
            onChange={setLocationName}
            onLocationSelect={(loc) => {
              setLocationName(loc.name);
              setLocationLat(loc.lat);
              setLocationLng(loc.lng);
            }}
            placeholder="Search venue, restaurant, or address..."
            allowCustomName={true}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateEvent.isPending}
              className="gradient-primary"
            >
              {updateEvent.isPending ? 'Saving...' : 'Save Location'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
