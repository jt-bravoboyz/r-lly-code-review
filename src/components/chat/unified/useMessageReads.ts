import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MessageRead } from './types';

export function useMessageReads(chatId: string, messageIds: string[]) {
  const { profile } = useAuth();
  const [reads, setReads] = useState<MessageRead[]>([]);
  const markedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!chatId || messageIds.length === 0) {
      setReads([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('message_reads')
        .select('*')
        .in('message_id', messageIds);
      if (!cancelled && data) setReads(data as MessageRead[]);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, messageIds.length]);

  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`reads-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reads' },
        (payload) => {
          const r = payload.new as MessageRead;
          setReads((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const markRead = useCallback(
    async (messageId: string) => {
      if (!profile?.id) return;
      const key = `${messageId}:${profile.id}`;
      if (markedRef.current.has(key)) return;
      markedRef.current.add(key);
      // Skip if already in reads
      if (reads.some((r) => r.message_id === messageId && r.profile_id === profile.id)) return;
      await supabase
        .from('message_reads')
        .insert({ message_id: messageId, profile_id: profile.id })
        .select();
    },
    [profile?.id, reads]
  );

  return { reads, markRead };
}
