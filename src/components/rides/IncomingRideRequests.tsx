import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, Check, X, Clock, Navigation, Loader2 } from 'lucide-react';
import { useRideRequests, useAcceptRideRequest, useDismissRideRequest } from '@/hooks/useRideRequests';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface IncomingRideRequestsProps {
  eventId?: string;
}

export function IncomingRideRequests({ eventId }: IncomingRideRequestsProps) {
  const { data: requests, isLoading } = useRideRequests(eventId);
  const acceptRequest = useAcceptRideRequest();
  const dismissRequest = useDismissRideRequest();
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  // Filter to only show unread (pending) requests
  const pendingRequests = requests?.filter(r => !r.read) || [];

  const handleAccept = async (request: typeof pendingRequests[0]) => {
    if (!request.data?.requester_id) {
      toast.error('Invalid request data');
      return;
    }

    setPendingActions(prev => new Set(prev).add(request.id));
    try {
      await acceptRequest.mutateAsync({
        requestId: request.id,
        requesterId: request.data.requester_id,
        pickupLocation: request.data.pickup_location,
        eventId: request.data.event_id
      });
      toast.success(`You're picking up ${request.requester?.display_name || 'the rider'}!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept request');
    } finally {
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const handleDismiss = async (requestId: string) => {
    setPendingActions(prev => new Set(prev).add(requestId));
    try {
      await dismissRequest.mutateAsync(requestId);
      toast.success('Request dismissed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to dismiss');
    } finally {
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card shadow-sm rounded-2xl">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground font-montserrat flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          Incoming Ride Requests
        </h3>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {pendingRequests.length} pending
        </Badge>
      </div>

      <div className="space-y-3">
        {pendingRequests.map((request) => {
          const isActionPending = pendingActions.has(request.id);

          return (
            <Card key={request.id} className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200 rounded-2xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-blue-200">
                    <AvatarImage src={request.requester?.avatar_url || undefined} />
                    <AvatarFallback className="bg-blue-500 text-white font-bold">
                      {request.requester?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground font-montserrat">
                        {request.requester?.display_name || 'Someone'}
                      </span>
                      <span className="text-sm text-muted-foreground">needs a ride</span>
                    </div>

                    {request.data?.pickup_location && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{request.data.pickup_location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={() => handleAccept(request)}
                    disabled={isActionPending}
                  >
                    {isActionPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Accept & Pickup
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-muted-foreground/30"
                    onClick={() => handleDismiss(request.id)}
                    disabled={isActionPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
