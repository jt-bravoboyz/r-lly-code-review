import { useState } from 'react';
import { Car, MapPin, Clock, Users, Navigation, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateRideRequest } from '@/hooks/useRides';
import { RequestRideDialog } from './RequestRideDialog';
import { toast } from 'sonner';

interface RideCardProps {
  ride: {
    id: string;
    event_id?: string | null;
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
  const updateRequest = useUpdateRideRequest();
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  // Normalize: treat 'accepted' and 'confirmed' the same
  const acceptedPassengers = ride.passengers?.filter(p => 
    p.status === 'accepted' || p.status === 'confirmed'
  ) || [];
  const pendingPassengers = ride.passengers?.filter(p => p.status === 'pending') || [];
  const seatsLeft = (ride.available_seats || 4) - acceptedPassengers.length;
  const isDriver = profile?.id === ride.driver?.id;
  const hasRequested = ride.passengers?.some(p => p.passenger?.id === profile?.id);

  const handleAccept = async (passengerId: string, passengerName: string) => {
    setPendingActions(prev => new Set(prev).add(passengerId));
    try {
      await updateRequest.mutateAsync({ 
        requestId: passengerId, 
        status: 'accepted',
        eventId: ride.event_id || undefined,
        passengerName,
        driverName: profile?.display_name || undefined
      });
      toast.success(`Accepted ${passengerName}'s ride request!`);
    } catch (error: any) {
      console.error('Accept ride request failed:', error);
      toast.error(`Failed to accept: ${error?.message || 'Unknown error'}`);
    } finally {
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(passengerId);
        return next;
      });
    }
  };

  const handleDecline = async (passengerId: string, passengerName: string) => {
    setPendingActions(prev => new Set(prev).add(passengerId));
    try {
      await updateRequest.mutateAsync({ 
        requestId: passengerId, 
        status: 'declined',
        eventId: ride.event_id || undefined,
        passengerName
      });
      toast.success(`Declined ${passengerName}'s request`);
    } catch (error: any) {
      console.error('Decline ride request failed:', error);
      toast.error(`Failed to decline: ${error?.message || 'Unknown error'}`);
    } finally {
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(passengerId);
        return next;
      });
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

            {acceptedPassengers.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex -space-x-2">
                  {acceptedPassengers.slice(0, 3).map((p) => (
                    <Avatar key={p.id} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={p.passenger?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {p.passenger?.display_name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {acceptedPassengers.length > 3 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      +{acceptedPassengers.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Inline pending requests for driver with Accept/Decline */}
            {isDriver && pendingPassengers.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-amber-700">
                  {pendingPassengers.length} pending request{pendingPassengers.length > 1 ? 's' : ''}
                </p>
                {pendingPassengers.map((p) => {
                  const isActionPending = pendingActions.has(p.id);
                  const passengerName = p.passenger?.display_name || 'Unknown';
                  return (
                    <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={p.passenger?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-amber-200 text-amber-700">
                          {passengerName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium flex-1 truncate">{passengerName}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDecline(p.id, passengerName)}
                        disabled={isActionPending}
                      >
                        {isActionPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 w-7 p-0 bg-green-500 hover:bg-green-600"
                        onClick={() => handleAccept(p.id, passengerName)}
                        disabled={isActionPending}
                      >
                        {isActionPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Request Ride Button - For non-drivers who haven't requested */}
            {!isDriver && !hasRequested && seatsLeft > 0 && (
              <div className="mt-3">
                <RequestRideDialog
                  eventId={ride.event_id || undefined}
                  rideId={ride.id}
                  driverName={ride.driver?.display_name || undefined}
                  trigger={
                    <Button 
                      className="w-full"
                      variant="secondary"
                      size="sm"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Request Ride from {ride.driver?.display_name?.split(' ')[0] || 'Driver'}
                    </Button>
                  }
                />
              </div>
            )}

            {hasRequested && (
              <Badge className="mt-3" variant="outline">
                Ride Requested - Waiting for approval
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}