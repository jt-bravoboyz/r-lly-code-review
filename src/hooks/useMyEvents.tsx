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

      // Rely on the `events` SELECT RLS policy to scope rows to:
      // creator OR cohost OR attendee OR pending/accepted invitee.
      // The previous client-side `.or('creator_id.eq.X,id.in.(...)')` filter
      // had a PostgREST comma-collision bug that silently returned zero rows
      // for users with attended events (e.g. JT).
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(id, display_name, avatar_url),
          attendees:event_attendees(count)
        `)
        .order('start_time', { ascending: false });

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
        past,
      };
    },
  });
}
