import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getCurrentTier, getNextTier, getProgressToNextTier, BADGE_TIERS } from '@/lib/badges';

export interface UserStats {
  rallies_attended: number;
  dd_trips: number;
  safe_homes: number;
  rides_given: number;
  squads_created: number;
  messages_sent: number;
}

export function useBadges() {
  const { profile } = useAuth();

  // Fetch user stats from various tables
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats', profile?.id],
    queryFn: async (): Promise<UserStats> => {
      if (!profile?.id) {
        return {
          rallies_attended: 0,
          dd_trips: 0,
          safe_homes: 0,
          rides_given: 0,
          squads_created: 0,
          messages_sent: 0,
        };
      }

      // Fetch all stats in parallel
      const [attendeesResult, ridesResult, squadsResult, messagesResult] = await Promise.all([
        supabase
          .from('event_attendees')
          .select('id, arrived_safely, status')
          .eq('profile_id', profile.id),
        supabase
          .from('rides')
          .select('id, status')
          .eq('driver_id', profile.id),
        supabase
          .from('squads')
          .select('id')
          .eq('owner_id', profile.id),
        supabase
          .from('messages')
          .select('id')
          .eq('sender_id', profile.id),
      ]);

      const attendees = attendeesResult.data || [];
      const rides = ridesResult.data || [];
      const squads = squadsResult.data || [];
      const messages = messagesResult.data || [];

      return {
        rallies_attended: attendees.length,
        dd_trips: rides.filter(r => r.status === 'completed').length,
        safe_homes: attendees.filter(a => (a as any).arrived_safely).length,
        rides_given: rides.length,
        squads_created: squads.length,
        messages_sent: messages.length,
      };
    },
    enabled: !!profile?.id,
  });

  const points = profile?.reward_points || 0;
  const currentTier = getCurrentTier(points);
  const nextTier = getNextTier(points);
  const progress = getProgressToNextTier(points);

  return {
    stats: stats || {
      rallies_attended: 0,
      dd_trips: 0,
      safe_homes: 0,
      rides_given: 0,
      squads_created: 0,
      messages_sent: 0,
    },
    statsLoading,
    points,
    currentTier,
    nextTier,
    progress,
    allTiers: BADGE_TIERS,
  };
}
