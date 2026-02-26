import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Event = Tables<'events'>;
type EventInsert = TablesInsert<'events'>;

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(id, display_name, avatar_url),
          attendees:event_attendees(count)
        `)
        .gte('start_time', new Date().toISOString())
        .not('status', 'eq', 'completed') // Exclude completed events
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
}

export function usePastEvents() {
  return useQuery({
    queryKey: ['past-events'],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return [];

      // Get events user attended
      const { data: attendedEvents } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('profile_id', profile.id);

      const attendedEventIds = attendedEvents?.map(a => a.event_id) || [];

      // MED-5: Guard empty array to avoid invalid SQL
      let query = supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(id, display_name, avatar_url),
          attendees:event_attendees(count)
        `)
        .lt('start_time', new Date().toISOString());

      if (attendedEventIds.length > 0) {
        query = query.or(`creator_id.eq.${profile.id},id.in.(${attendedEventIds.join(',')})`);
      } else {
        query = query.eq('creator_id', profile.id);
      }

      const { data, error } = await query
        .order('start_time', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    }
  });
}

export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      
      // Fetch event with creator
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(id, display_name, avatar_url),
          stops:barhop_stops(*)
        `)
        .eq('id', eventId)
        .single();
      
      if (eventError) throw eventError;
      
      // Fetch attendees separately with profiles
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select(`
          id,
          profile_id,
          status,
          share_location,
          current_lat,
          current_lng,
          going_home_at,
          arrived_safely,
          is_dd
        `)
        .eq('event_id', eventId);
      
      if (attendeesError) throw attendeesError;
      
      // Fetch profiles for attendees
      const profileIds = attendeesData?.map(a => a.profile_id).filter(Boolean) || [];
      let profilesMap = new Map<string, { id: string; display_name: string | null; avatar_url: string | null }>();
      
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', profileIds);
        
        profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
      }
      
      // Combine attendees with profiles
      const attendees = (attendeesData || []).map(a => ({
        ...a,
        arrived_safely: (a as any).arrived_safely ?? false,
        profile: profilesMap.get(a.profile_id) || { id: a.profile_id, display_name: null, avatar_url: null }
      }));
      
      return {
        ...eventData,
        attendees
      };
    },
    enabled: !!eventId
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: EventInsert & { is_quick_rally?: boolean }) => {
      const { data, error } = await supabase
        .from('events')
        .insert(event)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      
      // Award points for creating event
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase.rpc('rly_award_points', {
            p_user_id: user.id,
            p_event_type: 'create_event',
            p_source_id: data.id
          });
        }
      } catch (e) { console.error('Points award failed:', e); }
    }
  });
}

export function useJoinEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId }: { eventId: string; profileId: string }) => {
      // Use the secure RPC to avoid RLS insert issues and support host approval.
      const { data, error } = await supabase.rpc('request_join_event', {
        p_event_id: eventId,
      });

      if (error) throw error;

      // RPC returns jsonb like: { success: true, status: 'pending' } OR { error, status }
      return data as { success?: boolean; error?: string; status?: 'pending' | 'attending' };
    },
    onSuccess: async (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });

      // Only award “join_event” points once the user is actually attending.
      if (result?.status !== 'attending') return;

      try {
        await supabase.rpc('rly_award_points_by_profile', {
          p_profile_id: variables.profileId,
          p_event_type: 'join_event',
          p_source_id: variables.eventId,
        });
      } catch (e) {
        console.error('Points award failed:', e);
      }
    },
  });
}

export function useLeaveEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, profileId }: { eventId: string; profileId: string }) => {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('profile_id', profileId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: string; updates: Partial<Event> }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

export function useEventByInviteCode(inviteCode: string | undefined) {
  return useQuery({
    queryKey: ['event-invite', inviteCode],
    queryFn: async () => {
      if (!inviteCode) return null;
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(id, display_name, avatar_url),
          attendees:event_attendees(count)
        `)
        .eq('invite_code', inviteCode.toUpperCase())
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!inviteCode && inviteCode.length >= 6
  });
}