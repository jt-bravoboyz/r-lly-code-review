import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook to get current user's After R@lly status for an event
 */
export function useMyAfterRallyStatus(eventId: string | undefined) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['after-rally-status', eventId, profile?.id],
    queryFn: async () => {
      if (!eventId || !profile?.id) return null;
      
      const { data, error } = await supabase
        .from('event_attendees')
        .select('after_rally_opted_in, arrived_safely, dd_dropoff_confirmed_at')
        .eq('event_id', eventId)
        .eq('profile_id', profile.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!eventId && !!profile?.id,
  });
}
export function useStartRally() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase
        .from('events')
        .update({ status: 'live' })
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

export function useEndRally() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase
        .from('events')
        .update({ status: 'after_rally' })
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

export function useCompleteRally() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase
        .from('events')
        .update({ status: 'completed' })
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
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
      // Invalidate all relevant queries so UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['my-attendee', variables.eventId, variables.profileId] });
      queryClient.invalidateQueries({ queryKey: ['after-rally-status', variables.eventId, variables.profileId] });
    }
  });
}
