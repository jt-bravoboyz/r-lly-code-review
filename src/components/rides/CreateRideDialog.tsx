import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Car, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRide } from '@/hooks/useRides';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const rideSchema = z.object({
  available_seats: z.string().min(1, 'Number of seats is required'),
  departure_time: z.string().min(1, 'Departure time is required'),
  notes: z.string().optional(),
});

type RideFormData = z.infer<typeof rideSchema>;

interface CreateRideDialogProps {
  eventId?: string;
  trigger?: React.ReactNode;
  eventLocationName?: string;
}

export function CreateRideDialog({ eventId, trigger, eventLocationName }: CreateRideDialogProps) {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const createRide = useCreateRide();

  const form = useForm<RideFormData>({
    resolver: zodResolver(rideSchema),
    defaultValues: {
      available_seats: '4',
      departure_time: '',
      notes: '',
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
        // Auto-populate pickup and destination for DD rides
        pickup_location: eventLocationName || 'Event Location',
        destination: 'Safe rides home',
        available_seats: parseInt(data.available_seats),
        departure_time: new Date(data.departure_time).toISOString(),
        driverName: profile.display_name || 'Someone',
      });
      
      toast.success('You\'re now offering DD rides! 🚗', {
        description: 'Others can request a safe ride home from you.',
      });
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
            Offer Rides (DD)
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Offer DD Rides
          </DialogTitle>
          <DialogDescription>
            As a Designated Driver, you'll give safe rides home to attendees who need them.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Auto-populated info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">📍 Pickup:</span>
                <span className="font-medium">{eventLocationName || 'Event Location'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">🏠 Destination:</span>
                <span className="font-medium">Safe rides home</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="available_seats"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      Available Seats
                    </FormLabel>
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
                    <FormLabel className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Available From
                    </FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Notes (optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., I have a blue Honda Civic, can fit 4 comfortably..."
                      className="resize-none"
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full gradient-accent"
              disabled={createRide.isPending}
            >
              {createRide.isPending ? 'Setting up...' : 'Start Offering Rides'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}