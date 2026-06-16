import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Returns the count of incoming pending friend requests for the current user.
 * Used by BottomNav to badge the Squads tab.
 */
export function usePendingFriendRequestCount() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['pending-friend-requests-count', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count, error } = await (supabase as any)
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', profile.id)
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
