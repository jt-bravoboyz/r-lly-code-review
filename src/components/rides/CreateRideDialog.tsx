import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, MapPin, Clock, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCreateRide } from '@/hooks/useRides';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const rideSchema = z.object({
  pickup_location: z.string().min(1, 'Pickup location is required'),
  destination: z.string().min(1, 'Destination is required'),
  available_seats: z.string().min(1, 'Number of seats is required'),
  departure_time: z.string().min(1, 'Departure time is required')
});

type RideFormData = z.infer<typeof rideSchema>;

interface CreateRideDialogProps {
  eventId?: string;
  trigger?: React.ReactNode;
}

export function CreateRideDialog({ eventId, trigger }: CreateRideDialogProps) {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const createRide = useCreateRide();

  const form = useForm<RideFormData>({
    resolver: zodResolver(rideSchema),
    defaultValues: {
      pickup_location: '',
      destination: '',
      available_seats: '4',
      departure_time: ''
    }
  });

  const onSubmit = async (data: RideFormData) => {
    if (!profile) {
      toast.error('You must be logged in to offer a ride');
      return;
    }

    try {
      await createRide.mutateAsync({
        driver_id: profile.id,
        event_id: eventId || null,
        pickup_location: data.pickup_location,
        destination: data.destination,
        available_seats: parseInt(data.available_seats),
        departure_time: new Date(data.departure_time).toISOString()
      });
      
      toast.success('Ride created! Others can now request to join.');
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create ride');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gradient-accent">
            <Car className="h-4 w-4 mr-2" />
            Offer Ride
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offer a Ride (DD Mode)</DialogTitle>
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
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-success" />
                      <Input className="pl-9" placeholder="Where are you picking up?" {...field} />
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
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-destructive" />
                      <Input className="pl-9" placeholder="Where are you going?" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="available_seats"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Seats</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="departure_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departure Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full gradient-accent"
              disabled={createRide.isPending}
            >
              {createRide.isPending ? 'Creating...' : 'Offer Ride'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}