import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DmChatRow {
  chat_id: string;
  other_profile_id: string;
  other_display_name: string | null;
  other_avatar_url: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export function useMyDmChats() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dm-chats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [] as DmChatRow[];
      const { data, error } = await (supabase as any).rpc('list_my_dm_chats');
      if (error) throw error;
      return (data || []) as DmChatRow[];
    },
    enabled: !!profile?.id,
    staleTime: 1000 * 15,
  });

  // Refresh on any new message
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel('dm-chats-refresh')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dm-chats', profile.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  return query;
}

export function useOpenDmChat() {
  return useMutation({
    mutationFn: async (otherProfileId: string) => {
      const { data, error } = await (supabase as any).rpc('get_or_create_dm_chat', {
        p_other_profile_id: otherProfileId,
      });
      if (error) throw error;
      return data as string;
    },
  });
}

export function useMarkDmRead() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: string) => {
      if (!profile?.id) return;
      const { error } = await (supabase as any)
        .from('chat_participants')
        .update({ read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('profile_id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-chats', profile?.id] });
    },
  });
}
