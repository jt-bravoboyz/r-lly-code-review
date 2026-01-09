import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, MapPin, Clock, Users, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateRideRequest } from '@/hooks/useRides';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RideRequest {
  id: string;
  status: string | null;
  requested_at?: string | null;
  pickup_location?: string | null;
  passenger?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface RideWithRequests {
  id: string;
  pickup_location?: string | null;
  destination?: string | null;
  departure_time?: string | null;
  available_seats?: number | null;
  passengers?: RideRequest[];
}

interface RideRequestManagerProps {
  rides: RideWithRequests[];
  onRideComplete?: (rideId: string, passengerId: string) => void;
}

export function RideRequestManager({ rides, onRideComplete }: RideRequestManagerProps) {
  const { profile } = useAuth();
  const updateRequest = useUpdateRideRequest();
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  // Filter to only show rides where current user is the driver
  const myRides = rides.filter(r => true); // Already filtered in parent

  const handleAccept = async (requestId: string, passengerName: string) => {
    setPendingActions(prev => new Set(prev).add(requestId));
    try {
      await updateRequest.mutateAsync({ requestId, status: 'confirmed' });
      toast.success(`Accepted ${passengerName}'s ride request!`);
    } catch (error) {
      toast.error('Failed to accept request');
    } finally {
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleDecline = async (requestId: string, passengerName: string) => {
    setPendingActions(prev => new Set(prev).add(requestId));
    try {
      await updateRequest.mutateAsync({ requestId, status: 'declined' });
      toast.success(`Declined ${passengerName}'s request`);
    } catch (error) {
      toast.error('Failed to decline request');
    } finally {
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleComplete = async (rideId: string, request: RideRequest) => {
    if (request.passenger && onRideComplete) {
      onRideComplete(rideId, request.passenger.id);
    }
    
    setPendingActions(prev => new Set(prev).add(request.id));
    try {
      await updateRequest.mutateAsync({ requestId: request.id, status: 'completed' });
      toast.success(`Ride completed! Points awarded.`);
    } catch (error) {
      toast.error('Failed to complete ride');
    } finally {
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const pendingRequests = myRides.flatMap(ride => 
    (ride.passengers || [])
      .filter(p => p.status === 'pending')
      .map(p => ({ ...p, ride }))
  );

  const confirmedRequests = myRides.flatMap(ride => 
    (ride.passengers || [])
      .filter(p => p.status === 'confirmed')
      .map(p => ({ ...p, ride }))
  );

  if (pendingRequests.length === 0 && confirmedRequests.length === 0) {
    return (
      <Card className="bg-muted/30 rounded-2xl">
        <CardContent className="p-6 text-center">
          <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground font-montserrat">No ride requests yet</p>
          <p className="text-sm text-muted-foreground">Requests will appear here when someone needs a ride</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-amber-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Pending Requests ({pendingRequests.length})
          </h4>
          {pendingRequests.map((request) => (
            <Card key={request.id} className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.passenger?.avatar_url || undefined} />
                    <AvatarFallback className="bg-amber-200 text-amber-700">
                      {request.passenger?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{request.passenger?.display_name || 'Anonymous'}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {request.requested_at 
                          ? format(new Date(request.requested_at), 'h:mm a') 
                          : 'Just now'}
                      </span>
                    </div>
                    {request.pickup_location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{request.pickup_location}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleDecline(request.id, request.passenger?.display_name || 'User')}
                      disabled={pendingActions.has(request.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600"
                      onClick={() => handleAccept(request.id, request.passenger?.display_name || 'User')}
                      disabled={pendingActions.has(request.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmed Passengers */}
      {confirmedRequests.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-green-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Confirmed Passengers ({confirmedRequests.length})
          </h4>
          {confirmedRequests.map((request) => (
            <Card key={request.id} className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.passenger?.avatar_url || undefined} />
                    <AvatarFallback className="bg-green-200 text-green-700">
                      {request.passenger?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{request.passenger?.display_name || 'Anonymous'}</p>
                    <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-200 mt-1">
                      Confirmed
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    className="gradient-accent"
                    onClick={() => handleComplete(request.ride.id, request)}
                    disabled={pendingActions.has(request.id)}
                  >
                    Complete Ride
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}