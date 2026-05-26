import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type Event = Tables<'events'> & {
  creator: { id: string; display_name: string | null; avatar_url: string | null } | null;
  attendees: { count: number }[];
};

interface CategorizedEvents {
  current: Event[];
  upcoming: Event[];
  past: Event[];
}

const EMPTY: CategorizedEvents = { current: [], upcoming: [], past: [] };

export function useMyEvents() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: ['my-events-categorized', userId],
    enabled: !!userId,
    queryFn: async (): Promise<CategorizedEvents> => {
      if (!userId) return EMPTY;

      // Get user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[useMyEvents] profile lookup failed', profileError);
        throw profileError;
      }
      if (!profile) return EMPTY;

      // Get events user is attending
      const { data: attendedRows, error: attendedError } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('profile_id', profile.id);

      if (attendedError) {
        console.error('[useMyEvents] event_attendees lookup failed', attendedError);
        throw attendedError;
      }

      const attendedEventIds = Array.from(
        new Set((attendedRows ?? []).map((a) => a.event_id).filter(Boolean))
      );

      const selectClause = `
        *,
        creator:profiles!events_creator_id_fkey(id, display_name, avatar_url),
        attendees:event_attendees(count)
      ` as const;

      let query = supabase
        .from('events')
        .select(selectClause)
        .order('start_time', { ascending: false });

      if (attendedEventIds.length > 0) {
        // Union: events I created OR events I'm attending
        query = query.or(
          `creator_id.eq.${profile.id},id.in.(${attendedEventIds.join(',')})`
        );
      } else {
        // No attendance — fall back to events I created
        query = query.eq('creator_id', profile.id);
      }

      const { data: events, error } = await query;

      if (error) {
        console.error('[useMyEvents] events fetch failed', error);
        throw error;
      }

      const now = new Date();
      const current: Event[] = [];
      const upcoming: Event[] = [];
      const past: Event[] = [];

      (events || []).forEach((event: any) => {
        const start = new Date(event.start_time);
        const endTime = event.end_time
          ? new Date(event.end_time)
          : new Date(start.getTime() + 4 * 60 * 60 * 1000);

        const isLive =
          (start <= now && now <= endTime) ||
          event.status === 'live' ||
          event.status === 'after_rally';

        const isCompleted =
          event.status === 'completed' || event.status === 'cancelled';
        const isPast = now > endTime || isCompleted;
        const isUpcoming = start > now && !isLive;

        if (isLive && !isCompleted) {
          current.push(event);
        } else if (isUpcoming) {
          upcoming.push(event);
        } else if (isPast) {
          past.push(event);
        }
      });

      current.sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      upcoming.sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      return {
        current,
        upcoming,
        past: past.slice(0, 10),
      };
    },
  });
}
