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

      // Resolve current profile id + the set of event_ids the user actually attends,
      // so the Past list is strictly: events I hosted OR events I joined.
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      const profileId = profile?.id ?? null;

      let myAttendedEventIds = new Set<string>();
      if (profileId) {
        const { data: rows } = await supabase
          .from('event_attendees')
          .select('event_id')
          .eq('profile_id', profileId);
        myAttendedEventIds = new Set((rows || []).map((r: any) => r.event_id));
      }

      // Rely on the `events` SELECT RLS policy to scope rows to:
      // creator OR cohost OR attendee OR pending/accepted invitee.
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

      const staleLiveIds: string[] = [];

      (events || []).forEach((event: any) => {
        const start = new Date(event.start_time);
        const endTime = event.end_time
          ? new Date(event.end_time)
          : new Date(start.getTime() + 4 * 60 * 60 * 1000);

        const timeWindowEnded = now > endTime;
        const isCompleted =
          event.status === 'completed' || event.status === 'cancelled';

        // Time window is authoritative — a stale status='live' flag can't pin
        // a rally to Live Now after its end window has passed.
        const isLive =
          !timeWindowEnded &&
          !isCompleted &&
          ((start <= now && now <= endTime) ||
            event.status === 'live' ||
            event.status === 'after_rally');

        const isPast = timeWindowEnded || isCompleted;
        const isUpcoming = start > now && !isLive && !isPast;

        // Queue background self-heal: window has passed but DB still says live/after_rally
        if (
          timeWindowEnded &&
          (event.status === 'live' || event.status === 'after_rally') &&
          profileId &&
          event.creator_id === profileId
        ) {
          staleLiveIds.push(event.id);
        }

        if (isLive) {
          current.push(event);
        } else if (isUpcoming) {
          upcoming.push(event);
        } else if (isPast) {
          // Strict gate: only include past events the user actually participated in
          // (hosted or attended). Invites / cohost-only / admin views are excluded.
          const isHost = profileId && event.creator_id === profileId;
          const didAttend = myAttendedEventIds.has(event.id);
          if (isHost || didAttend) past.push(event);
        }
      });

      // Fire-and-forget self-heal so EventDetail, recap, etc. agree with bucketing.
      if (staleLiveIds.length > 0) {
        void supabase
          .from('events')
          .update({ status: 'completed' })
          .in('id', staleLiveIds)
          .then(({ error }) => {
            if (error) console.warn('[useMyEvents] self-heal failed', error);
          });
      }

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
