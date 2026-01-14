import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SquadDetailData {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  symbol?: string;
  group_photo_url?: string;
  owner_profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  members?: {
    id: string;
    profile_id: string;
    added_at: string;
    profile?: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  }[];
}

export interface SquadEventHistory {
  id: string;
  title: string;
  start_time: string;
  location_name: string | null;
  attendee_count: number;
}

// Fetch a single squad with full details
export function useSquadDetail(squadId: string | undefined) {
  return useQuery({
    queryKey: ['squad-detail', squadId],
    queryFn: async () => {
      if (!squadId) return null;

      const { data, error } = await supabase
        .from('squads')
        .select(`
          *,
          owner_profile:safe_profiles!squads_owner_id_fkey(id, display_name, avatar_url),
          members:squad_members(
            id,
            profile_id,
            added_at,
            profile:safe_profiles(id, display_name, avatar_url)
          )
        `)
        .eq('id', squadId)
        .single();

      if (error) throw error;
      return data as SquadDetailData;
    },
    enabled: !!squadId,
  });
}

// Fetch event history for a squad (events where squad members attended together)
export function useSquadEventHistory(squadId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['squad-event-history', squadId],
    queryFn: async () => {
      if (!squadId || !profile?.id) return [];

      // First get all member profile IDs including owner
      const { data: squad, error: squadError } = await supabase
        .from('squads')
        .select(`
          owner_id,
          members:squad_members(profile_id)
        `)
        .eq('id', squadId)
        .single();

      if (squadError) throw squadError;

      const memberIds = [
        squad.owner_id,
        ...(squad.members?.map((m: { profile_id: string }) => m.profile_id) || [])
      ];

      // Get events where at least 2 squad members attended (past events only)
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_time,
          location_name,
          attendees:event_attendees(profile_id)
        `)
        .lt('start_time', new Date().toISOString())
        .order('start_time', { ascending: false })
        .limit(20);

      if (eventsError) throw eventsError;

      // Filter events where at least 2 squad members attended
      const squadEvents = events
        .map(event => {
          const attendeeIds = event.attendees?.map((a: { profile_id: string }) => a.profile_id) || [];
          const squadAttendeesCount = memberIds.filter(id => attendeeIds.includes(id)).length;
          return {
            id: event.id,
            title: event.title,
            start_time: event.start_time,
            location_name: event.location_name,
            attendee_count: squadAttendeesCount,
          };
        })
        .filter(event => event.attendee_count >= 2);

      return squadEvents as SquadEventHistory[];
    },
    enabled: !!squadId && !!profile?.id,
  });
}

// Update squad group photo
export function useUpdateSquadPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ squadId, photoUrl }: { squadId: string; photoUrl: string }) => {
      const { error } = await supabase
        .from('squads')
        .update({ group_photo_url: photoUrl })
        .eq('id', squadId);

      if (error) throw error;
    },
    onSuccess: (_, { squadId }) => {
      queryClient.invalidateQueries({ queryKey: ['squad-detail', squadId] });
      queryClient.invalidateQueries({ queryKey: ['owned-squads'] });
      queryClient.invalidateQueries({ queryKey: ['member-squads'] });
      queryClient.invalidateQueries({ queryKey: ['squads'] });
    },
  });
}