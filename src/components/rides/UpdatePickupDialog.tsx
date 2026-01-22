import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { LocationSearch } from '@/components/location/LocationSearch';
import { LocationMapPreview } from '@/components/location/LocationMapPreview';

const updateSchema = z.object({
  pickup_location: z.string().min(1, 'Pickup location is required').max(200, 'Location too long'),
});

type UpdateFormData = z.infer<typeof updateSchema>;

interface UpdatePickupDialogProps {
  requestId: string;
  currentLocation?: string | null;
  trigger?: React.ReactNode;
  onUpdated?: () => void;
}

export function UpdatePickupDialog({ 
  requestId, 
  currentLocation, 
  trigger,
  onUpdated 
}: UpdatePickupDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);

  const form = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      pickup_location: currentLocation || '',
    }
  });

  const onSubmit = async (data: UpdateFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('ride_passengers')
        .update({
          pickup_location: data.pickup_location,
          pickup_lat: pickupCoords?.lat,
          pickup_lng: pickupCoords?.lng,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Pickup location updated!');
      queryClient.invalidateQueries({ queryKey: ['rides'] });
      setOpen(false);
      onUpdated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pickup location');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            <Pencil className="h-3 w-3 mr-1" />
            Update
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold font-montserrat">
            Update Pickup Location
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pickup_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Pickup Location</FormLabel>
                  <FormControl>
                    <LocationSearch
                      value={field.value}
                      onChange={field.onChange}
                      onLocationSelect={(loc) => {
                        field.onChange(loc.name);
                        setPickupCoords({ lat: loc.lat, lng: loc.lng });
                      }}
                      placeholder="Where should we pick you up?"
                      showMapPreview={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {pickupCoords && (
              <LocationMapPreview
                lat={pickupCoords.lat}
                lng={pickupCoords.lng}
                name="New Pickup"
                height="h-32"
                interactive={false}
              />
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Location'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
