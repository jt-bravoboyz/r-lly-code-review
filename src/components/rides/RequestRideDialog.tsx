import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const requestSchema = z.object({
  pickup_location: z.string().min(1, 'Pickup location is required').max(200, 'Location too long'),
  destination: z.string().min(1, 'Destination is required').max(200, 'Destination too long'),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface RequestRideDialogProps {
  eventId?: string;
  trigger?: React.ReactNode;
}

export function RequestRideDialog({ eventId, trigger }: RequestRideDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      pickup_location: '',
      destination: profile?.home_address || '',
    }
  });

  const onSubmit = async (data: RequestFormData) => {
    if (!profile) {
      toast.error('You must be logged in to request a ride');
      return;
    }

    setIsSubmitting(true);
    try {
      // First, get all DDs who have offered rides for this event
      const { data: availableRides } = await supabase
        .from('rides')
        .select('driver_id')
        .eq('status', 'available')
        .eq(eventId ? 'event_id' : 'id', eventId || '');

      const driverIds = availableRides?.map(r => r.driver_id).filter(Boolean) || [];

      // Create a ride request notification for all DDs on this event
      const { error } = await supabase
        .from('notifications')
        .insert({
          profile_id: profile.id,
          type: 'ride_request',
          title: 'Ride Requested',
          body: `Looking for a ride from ${data.pickup_location} to ${data.destination}`,
          data: {
            event_id: eventId,
            pickup_location: data.pickup_location,
            destination: data.destination,
            requester_id: profile.id,
            requester_name: profile.display_name
          }
        });

      if (error) throw error;

      // Send push notifications to all DDs with subscriptions
      if (driverIds.length > 0) {
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              driverProfileIds: driverIds,
              title: '🚗 New Ride Request!',
              body: `${profile.display_name || 'Someone'} needs a ride from ${data.pickup_location}`,
              data: {
                url: '/rides',
                event_id: eventId,
                requester_id: profile.id
              },
              tag: 'ride-request'
            }
          });
        } catch (pushError) {
          console.error('Push notification failed:', pushError);
          // Don't fail the request if push fails
        }
      }
      
      toast.success('Ride request sent! A R@lly DD will pick you up soon.');
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-montserrat">Request a R@lly Ride</DialogTitle>
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
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-primary" />
                      <Input className="pl-9" placeholder="Where should we pick you up?" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                      <Input className="pl-9" placeholder="Where are you going?" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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