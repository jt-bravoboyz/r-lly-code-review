import { useState } from 'react';
import { Car, MapPin, Clock, Users, Navigation, Check, X, Loader2, User, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateRideRequest } from '@/hooks/useRides';
import { RequestRideDialog } from './RequestRideDialog';
import { toast } from 'sonner';

interface PassengerInfo {
  id: string;
  status: string | null;
  pickup_location?: string | null;
  passenger?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

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
    passengers?: PassengerInfo[];
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
  const myRequest = ride.passengers?.find(p => p.passenger?.id === profile?.id);
  const hasRequested = !!myRequest;
  const isAccepted = myRequest?.status === 'accepted' || myRequest?.status === 'confirmed';
  
  // Get other riders (excluding self)
  const otherRiders = acceptedPassengers.filter(p => p.passenger?.id !== profile?.id);

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
            {/* Driver info */}
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={ride.driver?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {ride.driver?.display_name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{ride.driver?.display_name}</span>
              {isDriver && (
                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                  You're driving
                </Badge>
              )}
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

            {/* Rider accepted status - show for passengers who are accepted */}
            {!isDriver && isAccepted && (
              <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">You're confirmed!</span>
                </div>
                <p className="text-xs text-green-600">
                  {ride.driver?.display_name} will pick you up
                  {myRequest?.pickup_location && ` from ${myRequest.pickup_location}`}
                </p>
                
                {/* Show other riders */}
                {otherRiders.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs text-green-600 mb-1">Also riding:</p>
                    <div className="flex flex-wrap gap-2">
                      {otherRiders.map((p) => (
                        <div key={p.id} className="flex items-center gap-1 bg-green-100 rounded-full px-2 py-0.5">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={p.passenger?.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px] bg-green-200">
                              {p.passenger?.display_name?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-green-700 font-medium">
                            {p.passenger?.display_name?.split(' ')[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DD View: Accepted passengers with pickup locations */}
            {isDriver && acceptedPassengers.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">
                    {acceptedPassengers.length} confirmed rider{acceptedPassengers.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {acceptedPassengers.map((p) => (
                    <div key={p.id} className="flex items-start gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={p.passenger?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-green-200 text-green-700">
                          {p.passenger?.display_name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {p.passenger?.display_name}
                        </p>
                        {p.pickup_location && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-green-600 shrink-0" />
                            <span className="text-[11px] text-green-700 truncate">
                              {p.pickup_location}
                            </span>
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[9px] bg-green-100 text-green-700 border-green-300 shrink-0">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                        Confirmed
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Non-driver simple view of accepted passengers */}
            {!isDriver && !isAccepted && acceptedPassengers.length > 0 && (
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
                <span className="text-xs text-muted-foreground">riding</span>
              </div>
            )}

            {/* DD View: Pending requests with Accept/Decline */}
            {isDriver && pendingPassengers.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-amber-700">
                  {pendingPassengers.length} pending request{pendingPassengers.length > 1 ? 's' : ''}
                </p>
                {pendingPassengers.map((p) => {
                  const isActionPending = pendingActions.has(p.id);
                  const passengerName = p.passenger?.display_name || 'Unknown';
                  return (
                    <div key={p.id} className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2">
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
                      {p.pickup_location && (
                        <div className="flex items-center gap-1 mt-1.5 ml-8">
                          <MapPin className="h-3 w-3 text-amber-600 shrink-0" />
                          <span className="text-[11px] text-amber-700 truncate">
                            Pickup: {p.pickup_location}
                          </span>
                        </div>
                      )}
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

            {/* Pending request status for riders */}
            {hasRequested && !isAccepted && (
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