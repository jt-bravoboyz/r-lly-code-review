import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Ride = Tables<'rides'>;
type RideInsert = TablesInsert<'rides'>;

export function useRides(eventId?: string) {
  return useQuery({
    queryKey: ['rides', eventId],
    queryFn: async () => {
      let query = supabase
        .from('rides')
        .select(`
          *,
          driver:profiles!rides_driver_id_fkey(id, display_name, avatar_url),
          passengers:ride_passengers(
            id,
            status,
            passenger:profiles!ride_passengers_passenger_id_fkey(id, display_name, avatar_url)
          )
        `)
        .eq('status', 'available')
        .order('departure_time', { ascending: true });
      
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

export function useCreateRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ride: RideInsert) => {
      const { data, error } = await supabase
        .from('rides')
        .insert(ride)
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
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const { data, error } = await supabase
        .from('ride_passengers')
        .update({ status })
        .eq('id', requestId)
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