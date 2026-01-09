import { Car, MapPin, Clock, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useRequestRide } from '@/hooks/useRides';
import { toast } from 'sonner';

interface RideCardProps {
  ride: {
    id: string;
    pickup_location: string | null;
    destination: string | null;
    available_seats: number | null;
    departure_time: string | null;
    status: string | null;
    driver?: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
    passengers?: {
      id: string;
      status: string | null;
      passenger?: {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
      } | null;
    }[];
  };
}

export function RideCard({ ride }: RideCardProps) {
  const { profile } = useAuth();
  const requestRide = useRequestRide();

  const confirmedPassengers = ride.passengers?.filter(p => p.status === 'confirmed') || [];
  const seatsLeft = (ride.available_seats || 4) - confirmedPassengers.length;
  const isDriver = profile?.id === ride.driver?.id;
  const hasRequested = ride.passengers?.some(p => p.passenger?.id === profile?.id);

  const handleRequestRide = async () => {
    if (!profile) {
      toast.error('Please sign in to request a ride');
      return;
    }

    try {
      await requestRide.mutateAsync({
        rideId: ride.id,
        passengerId: profile.id
      });
      toast.success('Ride requested! Waiting for driver approval.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to request ride');
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="p-3 rounded-full bg-accent/10">
              <Car className="h-6 w-6 text-accent" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={ride.driver?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {ride.driver?.display_name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{ride.driver?.display_name}</span>
              <Badge variant="outline" className="ml-auto">
                {seatsLeft} seats left
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              {ride.pickup_location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-success" />
                  <span className="truncate">From: {ride.pickup_location}</span>
                </div>
              )}
              
              {ride.destination && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-destructive" />
                  <span className="truncate">To: {ride.destination}</span>
                </div>
              )}
              
              {ride.departure_time && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{format(new Date(ride.departure_time), 'h:mm a')}</span>
                </div>
              )}
            </div>

            {confirmedPassengers.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex -space-x-2">
                  {confirmedPassengers.slice(0, 3).map((p) => (
                    <Avatar key={p.id} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={p.passenger?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {p.passenger?.display_name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {confirmedPassengers.length > 3 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      +{confirmedPassengers.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            {!isDriver && !hasRequested && seatsLeft > 0 && (
              <Button 
                className="w-full mt-3"
                variant="secondary"
                size="sm"
                onClick={handleRequestRide}
                disabled={requestRide.isPending}
              >
                Request Ride
              </Button>
            )}

            {hasRequested && (
              <Badge className="mt-3" variant="outline">
                Ride Requested
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}