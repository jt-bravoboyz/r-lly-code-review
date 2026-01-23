import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { LocationSearch } from '@/components/location/LocationSearch';
import { LocationMapPreview } from '@/components/location/LocationMapPreview';

const requestSchema = z.object({
  pickup_location: z.string().min(1, 'Pickup location is required').max(200, 'Location too long'),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface RequestRideDialogProps {
  eventId?: string;
  rideId?: string;
  driverName?: string;
  trigger?: React.ReactNode;
  eventName?: string;
}

export function RequestRideDialog({ eventId, rideId, driverName, trigger, eventName }: RequestRideDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      pickup_location: '',
    }
  });

  const onSubmit = async (data: RequestFormData) => {
    if (!profile) {
      toast.error('You must be logged in to request a ride');
      return;
    }

    setIsSubmitting(true);
    try {
      // If requesting from a specific DD's ride, add as passenger
      if (rideId) {
        const { error: passengerError } = await supabase
          .from('ride_passengers')
          .insert({
            ride_id: rideId,
            passenger_id: profile.id,
            pickup_location: data.pickup_location,
            pickup_lat: pickupCoords?.lat,
            pickup_lng: pickupCoords?.lng,
            status: 'pending'
          });

        if (passengerError) throw passengerError;

        toast.success(`Ride requested from ${driverName || 'driver'}! Waiting for approval.`);
        queryClient.invalidateQueries({ queryKey: ['rides'] });
      } else {
        // General ride request (broadcast to DDs)
        // NOTE: We cannot insert notifications for other users directly due to RLS,
        // so we use the backend notification sender.
        if (!eventId) {
          toast.error('Please select an event first');
          return;
        }

        // Find recipients:
        // 1) Attendees marked as DD for this event
        // 2) Drivers who have offered an available ride for this event
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

        try {
          await supabase.functions.invoke('send-event-notification', {
            body: {
              type: 'ride_request',
              eventId,
              targetProfileIds: recipientIds,
              excludeProfileId: profile.id,
              title: '🚗 New Ride Request!',
              body: `${profile.display_name || 'Someone'} needs a ride from ${data.pickup_location}`,
              data: {
                event_id: eventId,
                pickup_location: data.pickup_location,
                requester_id: profile.id,
                requester_name: profile.display_name,
                url: `/events/${eventId}`,
              },
            },
          });
        } catch (notifError) {
          console.error('Failed to send ride request notification:', notifError);
        }
        
        toast.success('Ride request sent! A R@lly DD will pick you up soon.');
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
      
      setOpen(false);
      form.reset();
      setPickupCoords(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to request ride');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-white text-primary hover:bg-white/90 font-montserrat">
            <Navigation className="h-4 w-4 mr-2" />
            Request Ride
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-montserrat">
            {driverName ? `Request Ride from ${driverName}` : 'Request a R@lly Ride'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pickup_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Location</FormLabel>
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
                name="Pickup"
                height="h-32"
                interactive={false}
              />
            )}

            {eventName && (
              <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
                <span className="font-medium">Destination:</span> {eventName}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full gradient-accent"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Requesting...' : 'Request Ride'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}