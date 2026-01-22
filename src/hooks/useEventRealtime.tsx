import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EventUpdate {
  type: 'location_change' | 'status_change' | 'attendee_joined' | 'attendee_left';
  message: string;
  timestamp: Date;
}

export function useEventRealtime(eventId: string | undefined) {
  const [updates, setUpdates] = useState<EventUpdate[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId) return;

    // Subscribe to event updates
    const eventChannel = supabase
      .channel(`event-updates-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const oldData = payload.old as any;
          const newData = payload.new as any;

          // Check what changed
          if (oldData.location_name !== newData.location_name || 
              oldData.location_lat !== newData.location_lat ||
              oldData.location_lng !== newData.location_lng) {
            const update: EventUpdate = {
              type: 'location_change',
              message: `R@lly location updated to ${newData.location_name || 'a new location'}`,
              timestamp: new Date(),
            };
            setUpdates(prev => [update, ...prev.slice(0, 9)]);
            toast.info('📍 R@lly location updated!', {
              description: newData.location_name || 'Check the new meeting point',
            });
          }

          if (oldData.start_time !== newData.start_time) {
            const update: EventUpdate = {
              type: 'status_change',
              message: 'R@lly time has been updated',
              timestamp: new Date(),
            };
            setUpdates(prev => [update, ...prev.slice(0, 9)]);
            toast.info('⏰ R@lly time changed!', {
              description: 'Check the updated schedule',
            });
          }

          // Invalidate event query to refetch
          queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        }
      )
      .subscribe();

    // Subscribe to attendee changes
    const attendeeChannel = supabase
      .channel(`attendee-updates-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          // Fetch profile info for the new attendee
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', payload.new.profile_id)
            .single();

          const update: EventUpdate = {
            type: 'attendee_joined',
            message: `${profile?.display_name || 'Someone'} joined the R@lly!`,
            timestamp: new Date(),
          };
          setUpdates(prev => [update, ...prev.slice(0, 9)]);
          toast.success(`🎉 ${profile?.display_name || 'Someone'} joined!`);

          // Invalidate event query
          queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          const update: EventUpdate = {
            type: 'attendee_left',
            message: 'Someone left the R@lly',
            timestamp: new Date(),
          };
          setUpdates(prev => [update, ...prev.slice(0, 9)]);

          // Invalidate event query
          queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventChannel);
      supabase.removeChannel(attendeeChannel);
    };
  }, [eventId, queryClient]);

  return { updates };
}
