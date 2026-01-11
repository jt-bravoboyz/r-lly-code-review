import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PastEventInvite {
  id: string;
  event_id: string;
  invited_profile_id: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  responded_at: string | null;
  event: {
    id: string;
    title: string;
    start_time: string;
    end_time: string | null;
    location_name: string | null;
    is_quick_rally: boolean;
    is_barhop: boolean;
    creator: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  inviter: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Get all event invites for the current user (past and present)
export function useAllEventInvites() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['all-event-invites', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('event_invites')
        .select(`
          *,
          event:events(
            id, 
            title, 
            start_time, 
            end_time,
            location_name, 
            is_quick_rally, 
            is_barhop,
            creator:profiles!events_creator_id_fkey(id, display_name, avatar_url)
          ),
          inviter:profiles!event_invites_invited_by_fkey(id, display_name, avatar_url)
        `)
        .eq('invited_profile_id', profile.id)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return data as PastEventInvite[];
    },
    enabled: !!profile?.id,
  });
}

// Get past event invites (responded or event is over)
export function usePastEventInvites() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['past-event-invites', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('event_invites')
        .select(`
          *,
          event:events(
            id, 
            title, 
            start_time, 
            end_time,
            location_name, 
            is_quick_rally, 
            is_barhop,
            creator:profiles!events_creator_id_fkey(id, display_name, avatar_url)
          ),
          inviter:profiles!event_invites_invited_by_fkey(id, display_name, avatar_url)
        `)
        .eq('invited_profile_id', profile.id)
        .or(`status.neq.pending,event.start_time.lt.${now}`)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      
      // Filter for past events (start_time is in the past)
      const pastInvites = (data as PastEventInvite[]).filter(invite => 
        invite.status !== 'pending' || new Date(invite.event.start_time) < new Date()
      );
      
      return pastInvites;
    },
    enabled: !!profile?.id,
  });
}
