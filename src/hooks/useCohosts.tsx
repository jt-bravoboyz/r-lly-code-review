import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Cohost {
  id: string;
  event_id: string;
  profile_id: string;
  added_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useCohosts(eventId: string | undefined) {
  return useQuery({
    queryKey: ['cohosts', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('event_cohosts')
        .select(`
          *,
          profile:profiles!event_cohosts_profile_id_fkey(id, display_name, avatar_url)
        `)
        .eq('event_id', eventId);
      
      if (error) throw error;
      return data as unknown as Cohost[];
    },
    enabled: !!eventId,
  });
}

export function useAddCohost() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ eventId, profileId }: { eventId: string; profileId: string }) => {
      const { data, error } = await supabase
        .from('event_cohosts')
        .insert({ 
          event_id: eventId, 
          profile_id: profileId,
          added_by: profile?.id 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cohosts', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });
}

export function useRemoveCohost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, profileId }: { eventId: string; profileId: string }) => {
      const { error } = await supabase
        .from('event_cohosts')
        .delete()
        .eq('event_id', eventId)
        .eq('profile_id', profileId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cohosts', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });
}

export function useIsCohost(eventId: string | undefined) {
  const { profile } = useAuth();
  const { data: cohosts } = useCohosts(eventId);
  
  return cohosts?.some(c => c.profile_id === profile?.id) || false;
}
