import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { BADGES, checkBadgeEarned, type UserStats } from '@/lib/badges';
import { toast } from 'sonner';

export type { UserStats } from '@/lib/badges';

export function useBadges() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

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
          .select('id, arrived_home, status')
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
        safe_homes: attendees.filter(a => a.arrived_home).length,
        rides_given: rides.length,
        squads_created: squads.length,
        messages_sent: messages.length,
      };
    },
    enabled: !!profile?.id,
  });

  // Check and award new badges
  const checkAndAwardBadges = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !stats) return [];

      const currentBadges = profile.badges || [];
      const newBadges: string[] = [];

      for (const badge of BADGES) {
        const isEarned = checkBadgeEarned(badge, stats);
        const alreadyHas = currentBadges.includes(badge.id);

        if (isEarned && !alreadyHas) {
          newBadges.push(badge.id);
        }
      }

      if (newBadges.length > 0) {
        const updatedBadges = [...currentBadges, ...newBadges];
        const pointsToAdd = newBadges.length * 10; // 10 points per badge

        const { error } = await supabase
          .from('profiles')
          .update({
            badges: updatedBadges,
            reward_points: (profile.reward_points || 0) + pointsToAdd,
          })
          .eq('id', profile.id);

        if (error) throw error;

        return newBadges;
      }

      return [];
    },
    onSuccess: (newBadges) => {
      if (newBadges.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        
        newBadges.forEach(badgeId => {
          const badge = BADGES.find(b => b.id === badgeId);
          if (badge) {
            toast.success(`🏆 New Badge: ${badge.name}!`, {
              description: badge.description,
            });
          }
        });
      }
    },
  });

  const earnedBadges = BADGES.filter(badge => 
    (profile?.badges || []).includes(badge.id)
  );

  const unearnedBadges = BADGES.filter(badge => 
    !(profile?.badges || []).includes(badge.id)
  );

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
    earnedBadges,
    unearnedBadges,
    allBadges: BADGES,
    checkAndAwardBadges: checkAndAwardBadges.mutate,
  };
}
