import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FlyerAttendee {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface FlyerAttendeesResult {
  hostName: string | null;
  attendees: FlyerAttendee[];
  total: number;
}

/**
 * Returns up to 4 confirmed-attendee avatars + host name + total count
 * for the social-proof pill on the Themed Flyer Canvas.
 */
export function useFlyerAttendees(eventId: string | null | undefined) {
  return useQuery<FlyerAttendeesResult>({
    queryKey: ['flyer-attendees', eventId],
    enabled: !!eventId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!eventId) return { hostName: null, attendees: [], total: 0 };
      const { data: event } = await supabase
        .from('events')
        .select('creator_id')
        .eq('id', eventId)
        .maybeSingle();

      const { data: attendeeRows, count } = await supabase
        .from('event_attendees')
        .select('profile_id, status', { count: 'exact' })
        .eq('event_id', eventId)
        .in('status', ['going', 'attended']);

      const ids = (attendeeRows ?? []).map(r => r.profile_id).filter(Boolean) as string[];
      const top4 = ids.slice(0, 4);
      const lookupIds = Array.from(new Set([
        ...(event?.creator_id ? [event.creator_id] : []),
        ...top4,
      ]));

      let profiles: FlyerAttendee[] = [];
      if (lookupIds.length) {
        const { data } = await supabase
          .from('safe_profiles')
          .select('id, display_name, avatar_url')
          .in('id', lookupIds);
        profiles = (data ?? []) as FlyerAttendee[];
      }

      const hostName = event?.creator_id
        ? profiles.find(p => p.id === event.creator_id)?.display_name ?? null
        : null;
      const attendees = top4
        .map(id => profiles.find(p => p.id === id))
        .filter(Boolean) as FlyerAttendee[];

      return { hostName, attendees, total: count ?? ids.length };
    },
  });
}
