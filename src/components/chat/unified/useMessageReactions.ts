import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MessageReaction } from './types';

export function useMessageReactions(chatId: string, messageIds: string[]) {
  const { profile } = useAuth();
  const [reactions, setReactions] = useState<MessageReaction[]>([]);

  // Initial load
  useEffect(() => {
    if (!chatId || messageIds.length === 0) {
      setReactions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);
      if (!cancelled && data) setReactions(data as MessageReaction[]);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, messageIds.length]);

  // Realtime
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`reactions-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        (payload) => {
          const r = payload.new as MessageReaction;
          setReactions((prev) =>
            prev.some((x) => x.id === r.id) ? prev : [...prev, r]
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        (payload) => {
          const r = payload.old as MessageReaction;
          setReactions((prev) => prev.filter((x) => x.id !== r.id));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!profile?.id) return;
      const existing = reactions.find(
        (r) =>
          r.message_id === messageId &&
          r.profile_id === profile.id &&
          r.emoji === emoji
      );
      if (existing) {
        // Optimistic remove
        setReactions((prev) => prev.filter((r) => r.id !== existing.id));
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        const optimistic: MessageReaction = {
          id: `tmp-${Date.now()}-${Math.random()}`,
          message_id: messageId,
          profile_id: profile.id,
          emoji,
          created_at: new Date().toISOString(),
        };
        setReactions((prev) => [...prev, optimistic]);
        const { data, error } = await supabase
          .from('message_reactions')
          .insert({ message_id: messageId, profile_id: profile.id, emoji })
          .select()
          .single();
        if (error) {
          setReactions((prev) => prev.filter((r) => r.id !== optimistic.id));
        } else if (data) {
          setReactions((prev) =>
            prev.map((r) => (r.id === optimistic.id ? (data as MessageReaction) : r))
          );
        }
      }
    },
    [reactions, profile?.id]
  );

  return { reactions, toggleReaction };
}
