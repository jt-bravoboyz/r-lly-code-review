import { useState } from 'react';
import { ArrowRight, Bell, Check, MapPin, Clock, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { sendMovingToNextStopMessage, sendArrivedAtStopMessage } from '@/hooks/useSystemMessages';
import { format } from 'date-fns';

interface BarHopStop {
  id: string;
  name: string;
  address: string | null;
  lat?: number | null;
  lng?: number | null;
  stop_order: number;
  eta: string | null;
  arrived_at: string | null;
  departed_at: string | null;
}

interface BarHopControlsProps {
  eventId: string;
  stops: BarHopStop[];
  canManage: boolean;
  hostName: string;
}

// Calculate ETA using Haversine distance and assumed walking speed
function calculateETA(fromLat: number, fromLng: number, toLat: number, toLng: number): Date {
  // Haversine formula to calculate distance in km
  const R = 6371; // Earth radius in km
  const dLat = (toLat - fromLat) * Math.PI / 180;
  const dLng = (toLng - fromLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Assume walking speed of 5 km/h for bar hops
  const walkingSpeedKmH = 5;
  const hours = distance / walkingSpeedKmH;
  const eta = new Date(Date.now() + hours * 60 * 60 * 1000);
  return eta;
}

// Send push notification for bar hop events
async function sendBarHopPushNotification(
  eventId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-event-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'bar_hop_transition',
          eventId,
          title,
          body,
        }),
      }
    );
  } catch (error) {
    console.error('Failed to send bar hop push notification:', error);
    // Don't throw - push notification failure shouldn't break the flow
  }
}

export function BarHopControls({ eventId, stops, canManage, hostName }: BarHopControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  // Sort stops by order
  const sortedStops = [...stops].sort((a, b) => a.stop_order - b.stop_order);
  
  // Find current stop (last one arrived at but not departed)
  const currentStop = sortedStops.find(s => s.arrived_at && !s.departed_at);
  const currentIndex = currentStop ? sortedStops.findIndex(s => s.id === currentStop.id) : -1;
  const nextStop = currentIndex >= 0 && currentIndex < sortedStops.length - 1 
    ? sortedStops[currentIndex + 1] 
    : sortedStops.find(s => !s.arrived_at);

  // Check if we're currently "traveling" (departed from current but not arrived at next)
  const isTraveling = currentStop?.departed_at && nextStop && !nextStop.arrived_at;

  // Get chat ID for the event
  const getChatId = async () => {
    const { data } = await supabase
      .from('chats')
      .select('id')
      .or(`event_id.eq.${eventId},linked_event_id.eq.${eventId}`)
      .maybeSingle();
    return data?.id;
  };

  // Get host's current location from event_attendees
  const getHostLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    if (!profile?.id) return null;
    
    const { data } = await supabase
      .from('event_attendees')
      .select('current_lat, current_lng')
      .eq('event_id', eventId)
      .eq('profile_id', profile.id)
      .maybeSingle();
    
    if (data?.current_lat && data?.current_lng) {
      return { lat: data.current_lat, lng: data.current_lng };
    }
    return null;
  };

  const handleArriveAtStop = async (stop: BarHopStop) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('barhop_stops')
        .update({ arrived_at: new Date().toISOString() })
        .eq('id', stop.id);

      if (error) throw error;

      // Update event status to 'live' if not already
      await supabase
        .from('events')
        .update({ status: 'live' })
        .eq('id', eventId);

      // Send notification to chat
      const chatId = await getChatId();
      if (chatId) {
        await sendArrivedAtStopMessage(chatId, stop.name);
      }

      // Send push notification to all attendees
      await sendBarHopPushNotification(
        eventId,
        `Arrived at ${stop.name}! 🎉`,
        `Your group has arrived at the next stop`
      );

      toast.success(`Arrived at ${stop.name}! 🍺`);
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update stop');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveToNextStop = async () => {
    if (!currentStop || !nextStop) return;
    
    setIsLoading(true);
    try {
      // Calculate ETA if next stop has coordinates
      let eta: Date | null = null;
      
      if (nextStop.lat && nextStop.lng) {
        // Try to get host's current location first
        const hostLocation = await getHostLocation();
        
        if (hostLocation) {
          // Use host's current location
          eta = calculateETA(hostLocation.lat, hostLocation.lng, nextStop.lat, nextStop.lng);
        } else if (currentStop.lat && currentStop.lng) {
          // Fallback to current stop's location
          eta = calculateETA(currentStop.lat, currentStop.lng, nextStop.lat, nextStop.lng);
        }
      }

      // Mark current stop as departed
      const { error: departError } = await supabase
        .from('barhop_stops')
        .update({ departed_at: new Date().toISOString() })
        .eq('id', currentStop.id);

      if (departError) throw departError;

      // Update next stop with calculated ETA
      if (eta) {
        await supabase
          .from('barhop_stops')
          .update({ eta: eta.toISOString() })
          .eq('id', nextStop.id);
      }

      // Send notification to chat with ETA
      const chatId = await getChatId();
      if (chatId) {
        await sendMovingToNextStopMessage(chatId, currentStop.name, nextStop.name, hostName);
      }

      // Send push notification for departure
      const etaText = eta ? ` - ETA ${format(eta, 'h:mm a')}` : '';
      await sendBarHopPushNotification(
        eventId,
        `Moving to ${nextStop.name} 🚶`,
        `Leaving ${currentStop.name}${etaText}`
      );

      const etaMessage = eta ? ` ETA: ${format(eta, 'h:mm a')}` : '';
      toast.success(`Moving to ${nextStop.name}!${etaMessage} 🚶`, {
        description: 'Your squad has been notified',
      });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canManage) {
    // Read-only view for non-hosts
    return (
      <Card className="border-secondary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-secondary" />
            Current Stop
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isTraveling && nextStop ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-secondary/10 border-secondary text-secondary animate-pulse">
                  <Navigation className="h-3 w-3 mr-1" />
                  Traveling
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Next:</span>
                <span className="font-medium">{nextStop.name}</span>
              </div>
              {nextStop.eta && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  ETA: {format(new Date(nextStop.eta), 'h:mm a')}
                </div>
              )}
            </div>
          ) : currentStop ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                Stop {currentStop.stop_order}
              </Badge>
              <span className="font-medium">{currentStop.name}</span>
            </div>
          ) : nextStop ? (
            <p className="text-muted-foreground text-sm">
              Next up: {nextStop.name}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">Bar hop not started</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-secondary/50 bg-gradient-to-r from-secondary/5 to-secondary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4 text-secondary" />
          Bar Hop Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Traveling indicator with ETA */}
        {isTraveling && nextStop && (
          <div className="p-3 bg-secondary/20 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-secondary/30 border-secondary text-secondary animate-pulse">
                <Navigation className="h-3 w-3 mr-1" />
                En Route
              </Badge>
              <span className="font-medium">{nextStop.name}</span>
            </div>
            {nextStop.eta && (
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-3 w-3 text-secondary" />
                <span>ETA: {format(new Date(nextStop.eta), 'h:mm a')}</span>
              </div>
            )}
          </div>
        )}

        {/* Current stop indicator */}
        {currentStop && !isTraveling && (
          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Now</Badge>
              <span className="font-medium">{currentStop.name}</span>
            </div>
            <Check className="h-4 w-4 text-green-500" />
          </div>
        )}

        {/* Next stop with move button */}
        {nextStop && !isTraveling && (
          <div className="space-y-2">
            {currentStop ? (
              <Button
                onClick={handleMoveToNextStop}
                disabled={isLoading}
                className="w-full bg-secondary hover:bg-secondary/90"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {isLoading ? 'Notifying...' : `Move to ${nextStop.name}`}
              </Button>
            ) : (
              <Button
                onClick={() => handleArriveAtStop(nextStop)}
                disabled={isLoading}
                className="w-full bg-secondary hover:bg-secondary/90"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {isLoading ? 'Updating...' : `Arrive at ${nextStop.name}`}
              </Button>
            )}
            <p className="text-xs text-center text-muted-foreground">
              This will notify all attendees via chat
            </p>
          </div>
        )}

        {/* Arrived at next stop button (while traveling) */}
        {isTraveling && nextStop && (
          <Button
            onClick={() => handleArriveAtStop(nextStop)}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-2" />
            {isLoading ? 'Updating...' : `Arrived at ${nextStop.name}`}
          </Button>
        )}

        {/* All stops completed */}
        {!nextStop && currentStop && !isTraveling && (
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <p className="text-green-600 font-medium">🎉 Bar hop complete!</p>
          </div>
        )}

        {/* No stops yet */}
        {sortedStops.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-2">
            Add stops to get started
          </p>
        )}
      </CardContent>
    </Card>
  );
}
