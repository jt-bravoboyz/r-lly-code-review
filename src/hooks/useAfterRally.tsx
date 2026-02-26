import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * ARCH-4: useMyAfterRallyStatus now uses consolidated query key
 * to share cache with useMyAttendeeStatus.
 */
export function useMyAfterRallyStatus(eventId: string | undefined) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['my-attendee-status', eventId, profile?.id],
    queryFn: async () => {
      if (!eventId || !profile?.id) return null;
      
      const { data, error } = await supabase
        .from('event_attendees')
        .select('after_rally_opted_in, arrived_safely, dd_dropoff_confirmed_at, going_home_at, not_participating_rally_home_confirmed, is_dd, needs_ride, destination_name, ride_pickup_location, location_prompt_shown, status, id, profile_id, dd_dropoff_confirmed_by, after_rally_location_name')
        .eq('event_id', eventId)
        .eq('profile_id', profile.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!eventId && !!profile?.id,
  });
}

async function transitionStatus(eventId: string, newStatus: string) {
  const { data, error } = await supabase.rpc('transition_event_status', {
    p_event_id: eventId,
    p_new_status: newStatus,
  });
  if (error) throw error;
  return data;
}

export function useStartRally() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => transitionStatus(eventId, 'live'),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

export function useEndRally() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => transitionStatus(eventId, 'after_rally'),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

export function useCompleteRally() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => transitionStatus(eventId, 'completed'),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

export function useOptIntoAfterRally() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      eventId, 
      profileId, 
      optIn,
      locationName 
    }: { 
      eventId: string; 
      profileId: string; 
      optIn: boolean;
      locationName?: string;
    }) => {
      const { data, error } = await supabase
        .from('event_attendees')
        .update({ 
          after_rally_opted_in: optIn,
          after_rally_location_name: locationName || null
        })
        .eq('event_id', eventId)
        .eq('profile_id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // ARCH-4: Invalidate consolidated query key
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['my-attendee-status', variables.eventId, variables.profileId] });
    }
  });
}
