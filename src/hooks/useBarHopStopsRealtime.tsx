import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBarHopStopsRealtime(eventId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`barhop-stops-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'barhop_stops',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('Bar hop stop change:', payload);
          
          // Invalidate event query to refresh stops
          queryClient.invalidateQueries({ queryKey: ['event', eventId] });
          
          // Show toast notifications for changes
          if (payload.eventType === 'INSERT') {
            const newStop = payload.new as { name: string };
            toast.info(`New stop added: ${newStop.name} 🍺`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedStop = payload.new as { name: string; arrived_at?: string; departed_at?: string };
            const oldStop = payload.old as { arrived_at?: string; departed_at?: string };
            
            // Check if this is an arrival update
            if (!oldStop.arrived_at && updatedStop.arrived_at) {
              toast.success(`Arrived at ${updatedStop.name}! 🎉`);
            }
            // Check if this is a departure update
            else if (!oldStop.departed_at && updatedStop.departed_at) {
              toast.info(`Left ${updatedStop.name}, moving on! 🚶`);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedStop = payload.old as { name: string };
            toast.info(`Stop removed: ${deletedStop.name}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);
}
