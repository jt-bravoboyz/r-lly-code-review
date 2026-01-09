import { useState } from 'react';
import { ArrowRight, Bell, Check, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sendMovingToNextStopMessage, sendArrivedAtStopMessage } from '@/hooks/useSystemMessages';

interface BarHopStop {
  id: string;
  name: string;
  address: string | null;
  stop_order: number;
  arrived_at: string | null;
  departed_at: string | null;
}

interface BarHopControlsProps {
  eventId: string;
  stops: BarHopStop[];
  canManage: boolean;
  hostName: string;
}

export function BarHopControls({ eventId, stops, canManage, hostName }: BarHopControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Sort stops by order
  const sortedStops = [...stops].sort((a, b) => a.stop_order - b.stop_order);
  
  // Find current stop (last one arrived at but not departed)
  const currentStop = sortedStops.find(s => s.arrived_at && !s.departed_at);
  const currentIndex = currentStop ? sortedStops.findIndex(s => s.id === currentStop.id) : -1;
  const nextStop = currentIndex >= 0 && currentIndex < sortedStops.length - 1 
    ? sortedStops[currentIndex + 1] 
    : sortedStops.find(s => !s.arrived_at);

  // Get chat ID for the event
  const getChatId = async () => {
    const { data } = await supabase
      .from('chats')
      .select('id')
      .eq('event_id', eventId)
      .single();
    return data?.id;
  };

  const handleArriveAtStop = async (stop: BarHopStop) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('barhop_stops')
        .update({ arrived_at: new Date().toISOString() })
        .eq('id', stop.id);

      if (error) throw error;

      // Send notification to chat
      const chatId = await getChatId();
      if (chatId) {
        await sendArrivedAtStopMessage(chatId, stop.name);
      }

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
      // Mark current stop as departed
      const { error: departError } = await supabase
        .from('barhop_stops')
        .update({ departed_at: new Date().toISOString() })
        .eq('id', currentStop.id);

      if (departError) throw departError;

      // Send notification to chat
      const chatId = await getChatId();
      if (chatId) {
        await sendMovingToNextStopMessage(chatId, currentStop.name, nextStop.name, hostName);
      }

      toast.success(`Moving to ${nextStop.name}! 🚶`, {
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
          {currentStop ? (
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
        {/* Current stop indicator */}
        {currentStop && (
          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Now</Badge>
              <span className="font-medium">{currentStop.name}</span>
            </div>
            <Check className="h-4 w-4 text-green-500" />
          </div>
        )}

        {/* Next stop with move button */}
        {nextStop && (
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

        {/* All stops completed */}
        {!nextStop && currentStop && (
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
