import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface InviteHistoryEntry {
  id: string;
  inviter_id: string;
  invited_profile_id: string | null;
  invited_phone: string | null;
  invited_name: string | null;
  last_invited_at: string;
  invite_count: number;
  // Joined profile data
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Fetch invite history for quick re-invites
export function useInviteHistory() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['invite-history', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('invite_history')
        .select(`
          *,
          profile:profiles!invite_history_invited_profile_id_fkey(id, display_name, avatar_url)
        `)
        .eq('inviter_id', profile.id)
        .order('last_invited_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as InviteHistoryEntry[];
    },
    enabled: !!profile?.id,
  });
}

// Record or update invite history
export function useRecordInvite() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      profileId, 
      phone, 
      name 
    }: { 
      profileId?: string; 
      phone?: string; 
      name?: string;
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');
      if (!profileId && !phone) throw new Error('Must provide profileId or phone');

      // Check if entry exists
      let query = supabase
        .from('invite_history')
        .select('id, invite_count')
        .eq('inviter_id', profile.id);

      if (profileId) {
        query = query.eq('invited_profile_id', profileId);
      } else if (phone) {
        query = query.eq('invited_phone', phone);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        // Update existing entry
        const { error } = await supabase
          .from('invite_history')
          .update({
            last_invited_at: new Date().toISOString(),
            invite_count: existing.invite_count + 1,
            invited_name: name || undefined,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('invite_history')
          .insert({
            inviter_id: profile.id,
            invited_profile_id: profileId || null,
            invited_phone: phone || null,
            invited_name: name || null,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invite-history'] });
    },
  });
}
