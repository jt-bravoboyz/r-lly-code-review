import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface Friendship {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: FriendshipStatus;
  requested_at: string;
  responded_at: string | null;
}

export interface PublicProfileSearchResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export function getFriendshipState(
  targetProfileId: string,
  friendships: Friendship[],
  currentProfileId?: string
) {
  const friendship = friendships.find(
    (f) => f.requester_id === targetProfileId || f.recipient_id === targetProfileId
  );

  if (!friendship || !currentProfileId) return { label: 'Add Friend', state: 'none' as const, friendship };
  if (friendship.status === 'accepted') return { label: 'Friends', state: 'accepted' as const, friendship };
  if (friendship.status === 'pending' && friendship.requester_id === currentProfileId) {
    return { label: 'Requested', state: 'pending_outgoing' as const, friendship };
  }
  if (friendship.status === 'pending' && friendship.recipient_id === currentProfileId) {
    return { label: 'Accept', state: 'pending_incoming' as const, friendship };
  }
  return { label: 'Add Friend', state: 'none' as const, friendship };
}

export function useFriendships() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['friendships', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await (supabase as any)
        .from('friendships')
        .select('id, requester_id, recipient_id, status, requested_at, responded_at')
        .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Friendship[];
    },
    enabled: !!profile?.id,
  });
}

export function usePublicProfileSearch(query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['public-profile-search', trimmed],
    queryFn: async () => {
      if (trimmed.length < 2) return [];
      const { data, error } = await (supabase as any).rpc('search_public_profiles', {
        p_query: trimmed,
        p_limit: 12,
      });

      if (error) throw error;
      return (data || []) as PublicProfileSearchResult[];
    },
    enabled: trimmed.length >= 2,
  });
}

export function useRequestFriend() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipientId: string) => {
      if (!profile?.id) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
        .from('friendships')
        .insert({ requester_id: profile.id, recipient_id: recipientId, status: 'pending' })
        .select('id')
        .single();

      if (error) throw error;

      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            driverProfileIds: [recipientId],
            title: 'New R@lly Friend request',
            body: `${profile.display_name || 'Someone'} wants to add you on R@lly`,
            data: { type: 'friend_request', friendship_id: data.id },
            tag: `friend-request-${data.id}`,
          },
        });
      } catch (pushError) {
        console.error('Failed to send friend request push:', pushError);
      }

      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['rally-friends'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['public-profile-search'] });
    },
  });
}

export function useRespondToFriendRequest() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ friendshipId, response }: { friendshipId: string; response: 'accepted' | 'declined' }) => {
      const { error } = await (supabase as any)
        .from('friendships')
        .update({ status: response, responded_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) throw error;
      return { friendshipId, response };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['rally-friends'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['public-profile-search'] });
    },
  });
}