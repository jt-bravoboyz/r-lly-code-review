import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { sendRideOfferedMessage, sendRideAcceptedMessage, sendRideDeclinedMessage } from './useSystemMessages';

type Ride = Tables<'rides'>;
type RideInsert = TablesInsert<'rides'>;

// Helper to get event's chat ID
async function getEventChatId(eventId: string): Promise<string | null> {
  const { data } = await supabase
    .from('chats')
    .select('id')
    .or(`event_id.eq.${eventId},linked_event_id.eq.${eventId}`)
    .maybeSingle();
  
  return data?.id || null;
}

export function useRides(eventId?: string) {
  const queryClient = useQueryClient();

  // Subscribe to realtime updates for rides
  useEffect(() => {
    const channel = supabase
      .channel('rides-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
        },
        () => {
          // Invalidate rides query on any change
          queryClient.invalidateQueries({ queryKey: ['rides'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_passengers',
        },
        () => {
          // Invalidate rides query when passengers change
          queryClient.invalidateQueries({ queryKey: ['rides'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['rides', eventId],
    queryFn: async () => {
      let query = supabase
        .from('rides')
        .select(`
          *,
          driver:profiles!rides_driver_id_fkey(id, display_name, avatar_url)
        `)
        // Show available and in_progress rides (not completed or cancelled)
        .in('status', ['available', 'in_progress'])
        .order('departure_time', { ascending: true });
      
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      
      const { data: rides, error } = await query;
      if (error) throw error;

      // Fetch passengers separately to avoid RLS recursion
      if (rides && rides.length > 0) {
        const rideIds = rides.map(r => r.id);
        const { data: passengers } = await supabase
          .from('ride_passengers')
          .select(`
            id,
            ride_id,
            status,
            requested_at,
            pickup_location,
            passenger:profiles!ride_passengers_passenger_id_fkey(id, display_name, avatar_url)
          `)
          .in('ride_id', rideIds);

        // Merge passengers into rides
        return rides.map(ride => ({
          ...ride,
          passengers: passengers?.filter(p => p.ride_id === ride.id) || []
        }));
      }

      return rides?.map(ride => ({ ...ride, passengers: [] })) || [];
    }
  });
}

export function useCreateRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ride: RideInsert & { driverName?: string }) => {
      const { driverName, ...rideData } = ride;
      
      const { data, error } = await supabase
        .from('rides')
        .insert(rideData)
        .select()
        .single();
      
      if (error) throw error;

      // Send system message if this ride is for an event
      if (rideData.event_id && driverName) {
        const chatId = await getEventChatId(rideData.event_id);
        if (chatId) {
          await sendRideOfferedMessage(chatId, driverName, rideData.available_seats || 4);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rides'] });
    }
  });
}

export function useRequestRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rideId, passengerId }: { rideId: string; passengerId: string }) => {
      const { data, error } = await supabase
        .from('ride_passengers')
        .insert({ ride_id: rideId, passenger_id: passengerId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rides'] });
    }
  });
}

export function useUpdateRideRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      status,
      eventId,
      passengerName,
      driverName,
    }: { 
      requestId: string; 
      status: string;
      eventId?: string;
      passengerName?: string;
      driverName?: string;
    }) => {
      // Fetch ride info along with the update for points awarding
      const { data, error } = await supabase
        .from('ride_passengers')
        .update({ status })
        .eq('id', requestId)
        .select(`
          *,
          ride:rides!ride_id(id, driver_id, event_id)
        `)
        .single();
      
      if (error) throw error;

      // Award points when ride is completed
      if (status === 'completed' && data.ride?.driver_id) {
        try {
          await supabase.rpc('rly_award_points_by_profile', {
            p_profile_id: data.ride.driver_id,
            p_event_type: 'drive_event',
            p_source_id: data.ride.id
          });
        } catch (pointsError) {
          console.error('Failed to award drive_event points:', pointsError);
        }
      }

      // Send system message for accepted/declined rides
      if (eventId && passengerName) {
        const chatId = await getEventChatId(eventId);
        if (chatId) {
          if (status === 'accepted' && driverName) {
            await sendRideAcceptedMessage(chatId, passengerName, driverName);
          } else if (status === 'declined') {
            await sendRideDeclinedMessage(chatId, passengerName);
          }
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rides'] });
    }
  });
}