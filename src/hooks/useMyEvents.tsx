import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

export function useMyEvents() {
  return useQuery({
    queryKey: ['my-events-categorized'],
    queryFn: async (): Promise<CategorizedEvents> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { current: [], upcoming: [], past: [] };

      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return { current: [], upcoming: [], past: [] };

      // Get events user is attending
      const { data: attendedEvents } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('profile_id', profile.id);

      const attendedEventIds = attendedEvents?.map(a => a.event_id) || [];

      if (attendedEventIds.length === 0) {
        // Also check for events they created
        const { data: createdEvents } = await supabase
          .from('events')
          .select(`
            *,
            creator:profiles!events_creator_id_fkey(id, display_name, avatar_url),
            attendees:event_attendees(count)
          `)
          .eq('creator_id', profile.id)
          .order('start_time', { ascending: false });

        const now = new Date();

        return {
          current: (createdEvents || []).filter(e => {
            const start = new Date(e.start_time);
            const endTime = e.end_time ? new Date(e.end_time) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
            return start <= now && now <= endTime && e.status !== 'completed' && e.status !== 'cancelled';
          }),
          upcoming: (createdEvents || []).filter(e => {
            const start = new Date(e.start_time);
            return start > now;
          }),
          past: (createdEvents || []).filter(e => {
            const start = new Date(e.start_time);
            const endTime = e.end_time ? new Date(e.end_time) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
            return now > endTime || e.status === 'completed';
          }).slice(0, 10),
        };
      }

      // Get all events user is attending or created
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(id, display_name, avatar_url),
          attendees:event_attendees(count)
        `)
        .or(`creator_id.eq.${profile.id},id.in.(${attendedEventIds.join(',')})`)
        .order('start_time', { ascending: false });

      if (error) throw error;

      const now = new Date();

      // Categorize events
      const current: Event[] = [];
      const upcoming: Event[] = [];
      const past: Event[] = [];

      (events || []).forEach((event) => {
        const start = new Date(event.start_time);
        // Default end time is 4 hours after start if not specified
        const endTime = event.end_time 
          ? new Date(event.end_time) 
          : new Date(start.getTime() + 4 * 60 * 60 * 1000);

        // Event is live/current if:
        // - start_time <= now AND (end_time > now OR status is 'live' or 'after_rally')
        const isLive = (start <= now && now <= endTime) || 
                      event.status === 'live' || 
                      event.status === 'after_rally';

        const isCompleted = event.status === 'completed' || event.status === 'cancelled';
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

      // Sort current and upcoming by start time ascending
      current.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      // Past events already sorted descending from query

      return {
        current,
        upcoming,
        past: past.slice(0, 10), // Limit past events
      };
    },
  });
}
