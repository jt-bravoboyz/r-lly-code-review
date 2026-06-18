import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { trackEvent } from '@/lib/analytics';

type Event = Tables<'events'>;
type EventInsert = TablesInsert<'events'>;

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      // Read events through the safe RPC. For stealth After R@lly events,
      // the RPC blanks out the After R@lly location/invite list and downgrades
      // status to 'completed' for non-invited viewers — so the parent R@lly row
      // stays visible to the original crew but the After R@lly stays private.
      const { data: safeRows, error } = await supabase
        .rpc('list_events_safe' as any);

      if (error) throw error;

      const nowIso = new Date().toISOString();
      const upcoming = (safeRows || []).filter((e: any) =>
        e?.start_time >= nowIso && e?.status !== 'completed'
      );

      // Enrich with creator profile and attendee counts (separate queries to
      // keep the RPC return shape simple and re-usable).
      const creatorIds: string[] = Array.from(new Set(upcoming.map((e: any) => e.creator_id).filter(Boolean)));
      const eventIds: string[] = upcoming.map((e: any) => e.id);

      const [{ data: creators }, { data: attendeeRows }] = await Promise.all([
        creatorIds.length
          ? supabase.from('safe_profiles').select('id, display_name, avatar_url').in('id', creatorIds)
          : Promise.resolve({ data: [] as any[] }),
        eventIds.length
          ? supabase.from('event_attendees').select('event_id').in('event_id', eventIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const creatorMap = new Map((creators || []).map((c: any) => [c.id, c]));
      const countMap = new Map<string, number>();
      (attendeeRows || []).forEach((a: any) => {
        countMap.set(a.event_id, (countMap.get(a.event_id) || 0) + 1);
      });

      return upcoming
        .map((e: any) => ({
          ...e,
          creator: creatorMap.get(e.creator_id) || null,
          attendees: [{ count: countMap.get(e.id) || 0 }],
        }))
        .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
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
      
      // Read the event through the safe RPC so After R@lly fields are masked
      // for non-invited viewers (status downgraded, location nulled).
      const { data: safeRows, error: eventError } = await supabase
        .rpc('get_event_safe' as any, { p_event_id: eventId });

      if (eventError) throw eventError;
      const safeEvent = (safeRows as any[] | null)?.[0];
      if (!safeEvent) return null;

      // Fetch creator profile and bar-hop stops in parallel.
      const [{ data: creatorRow }, { data: stops }] = await Promise.all([
        safeEvent.creator_id
          ? supabase.from('safe_profiles').select('id, display_name, avatar_url').eq('id', safeEvent.creator_id).maybeSingle()
          : Promise.resolve({ data: null as any }),
        supabase.from('barhop_stops').select('*').eq('event_id', eventId),
      ]);

      const eventData: any = {
        ...safeEvent,
        creator: creatorRow || null,
        stops: stops || [],
      };
      
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
          .from('safe_profiles')
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
      // Use SECURITY DEFINER RPC so creator_id is derived from auth.uid()
      // server-side. Eliminates RLS "permission denied" failures caused by a
      // stale/missing client-side profile during sign-in races.
      const { data, error } = await supabase.rpc('create_event' as any, {
        p_title: event.title,
        p_description: (event as any).description ?? null,
        p_event_type: (event as any).event_type ?? 'rally',
        p_start_time: event.start_time,
        p_location_name: (event as any).location_name ?? null,
        p_location_lat: (event as any).location_lat ?? null,
        p_location_lng: (event as any).location_lng ?? null,
        p_is_barhop: (event as any).is_barhop ?? false,
        p_cover_charge: (event as any).cover_charge ?? 0,
        p_split_check: (event as any).split_check ?? false,
        p_dress_code: (event as any).dress_code ?? null,
        p_song_recs_enabled: (event as any).song_recs_enabled ?? false,
        p_flyer_theme: (event as any).flyer_theme ?? null,
        p_flyer_custom_image_url: (event as any).flyer_custom_image_url ?? null,
        p_is_quick_rally: (event as any).is_quick_rally ?? false,
      });

      if (error) {
        // Detect stale clients still doing a direct INSERT (which RLS rejects)
        // or hitting the old "permission denied" path, and surface an
        // actionable message so users know to update.
        const msg = (error as any)?.message || '';
        const code = (error as any)?.code || '';
        if (
          code === '42501' ||
          /row-level security|permission denied/i.test(msg)
        ) {
          throw new Error(
            "Please update R@lly to the latest version to create events. Pull to refresh or reinstall if the issue persists."
          );
        }
        throw error;
      }
      return data as Event;
    },


    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      trackEvent('event_created', { event_id: data.id, event_type: data.event_type, is_barhop: data.is_barhop });
      
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
      trackEvent('event_joined', { event_id: variables.eventId });

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
      // Use SECURITY DEFINER RPC so prospective joiners (who aren't yet
      // attendees/invitees) can read just the safe preview fields without
      // needing broad SELECT access on the events table.
      const { data, error } = await supabase
        .rpc('get_event_preview_by_invite_code', { invite_code_param: inviteCode.toUpperCase() });

      if (error) throw error;
      const row = (data as any[] | null)?.[0];
      if (!row) return null;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        start_time: row.start_time,
        location_name: row.location_name,
        is_barhop: row.is_barhop,
        is_quick_rally: row.is_quick_rally,
        invite_code: row.invite_code,
        creator_id: row.creator_id,
        cover_charge: row.cover_charge,
        invite_code_expires_at: row.invite_code_expires_at,
        creator: {
          id: row.creator_id,
          display_name: row.creator_display_name,
          avatar_url: row.creator_avatar_url,
        },
        attendees: [{ count: Number(row.attendee_count) || 0 }],
      } as any;
    },
    enabled: !!inviteCode && inviteCode.length >= 4
  });

}