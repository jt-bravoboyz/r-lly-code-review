import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSendMessage } from '@/hooks/useChat';
import { useClearChatNotification } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { MessageBubble } from './MessageBubble';
import { ChatInputBar } from './ChatInputBar';
import { TypingIndicator } from './TypingIndicator';
import { TimestampDivider } from './TimestampDivider';
import { useMessageReactions } from './useMessageReactions';
import { useMessageReads } from './useMessageReads';
import type { ChatType, Message } from './types';
import { getPublicName } from '@/lib/identity';

interface Props {
  chatId: string;
  chatType: ChatType;
  messages: Message[];
  isLoading: boolean;
  storagePath: string;
  contextBanner?: React.ReactNode;
}

export function UnifiedChat({
  chatId,
  chatType,
  messages,
  isLoading,
  storagePath,
  contextBanner,
}: Props) {
  const { profile } = useAuth();
  const sendMessage = useSendMessage();
  const clearChatNotification = useClearChatNotification();

  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; at: number }>>({});
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSentAt = useRef(0);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { reactions, toggleReaction } = useMessageReactions(chatId, messageIds);
  const { reads, markRead } = useMessageReads(chatId, messageIds);

  // Clear chat notifications
  useEffect(() => {
    if (!chatId) return;
    clearChatNotification.mutate(chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Track newly added message ids for entry animation
  useEffect(() => {
    const fresh = new Set<string>();
    for (const m of messages) {
      if (!seenIdsRef.current.has(m.id)) {
        fresh.add(m.id);
        seenIdsRef.current.add(m.id);
      }
    }
    if (fresh.size > 0) {
      setFreshIds(fresh);
      const t = setTimeout(() => setFreshIds(new Set()), 1200);
      return () => clearTimeout(t);
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    const node = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (node) node.scrollTop = node.scrollHeight;
    else if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, typingUsers]);

  // Typing channel (broadcast)
  useEffect(() => {
    if (!chatId || !profile?.id) return;
    const channel = supabase.channel(`typing_indicator:chat-${chatId}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { profileId, name } = (payload.payload || {}) as { profileId?: string; name?: string };
        if (!profileId || profileId === profile.id || !name) return;
        setTypingUsers((prev) => ({ ...prev, [profileId]: { name, at: Date.now() } }));
      })
      .subscribe();
    typingChannelRef.current = channel;

    const sweep = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        let changed = false;
        for (const [id, v] of Object.entries(prev)) {
          if (now - v.at < 3500) next[id] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      clearInterval(sweep);
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [chatId, profile?.id]);

  const broadcastTyping = () => {
    const channel = typingChannelRef.current;
    if (!channel || !profile?.id) return;
    const now = Date.now();
    if (now - lastTypingSentAt.current < 1500) return;
    lastTypingSentAt.current = now;
    const name =
      (profile as any).nickname?.trim() ||
      (profile as any).display_name?.trim() ||
      (profile as any).full_name?.trim() ||
      'Someone';
    channel.send({ type: 'broadcast', event: 'typing', payload: { profileId: profile.id, name } });
  };

  const handlePickImage = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
      const filePath = `${storagePath}/${fileName}`;
      const { error: upErr } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file);
      if (upErr) throw upErr;
      const { data, error: urlErr } = await supabase.storage
        .from('chat-images')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      if (urlErr) throw urlErr;
      return data.signedUrl;
    } catch (err) {
      console.error('upload error', err);
      return null;
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !imageFile) || !chatId) return;
    setUploading(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl) {
          toast.error('Failed to upload image');
          return;
        }
      }
      await sendMessage.mutateAsync({
        chatId,
        content: text || (imageUrl ? '📷 Photo' : ''),
        imageUrl: imageUrl || undefined,
        messageType: imageUrl ? 'image' : 'text',
      });
      setText('');
      clearImage();
    } catch {
      toast.error('Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  // Build render plan: groupings + timestamp dividers
  const items = useMemo(() => {
    const out: Array<
      | { kind: 'divider'; key: string; at: string }
      | {
          kind: 'msg';
          key: string;
          message: Message;
          isFirstInGroup: boolean;
          isLastInGroup: boolean;
        }
    > = [];
    const GAP_MS = 30 * 60_000;
    let prev: Message | null = null;
    messages.forEach((m, i) => {
      const next = messages[i + 1] || null;
      if (!prev || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() >= GAP_MS) {
        out.push({ kind: 'divider', key: `d-${m.id}`, at: m.created_at });
      }
      const isFirst = !prev || prev.sender_id !== m.sender_id || (m.created_at && prev.created_at && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60_000);
      const isLast = !next || next.sender_id !== m.sender_id || (m.created_at && next.created_at && new Date(next.created_at).getTime() - new Date(m.created_at).getTime() > 5 * 60_000);
      out.push({
        kind: 'msg',
        key: m.id,
        message: m,
        isFirstInGroup: !!isFirst,
        isLastInGroup: !!isLast,
      });
      prev = m;
    });
    return out;
  }, [messages]);

  // Reactions per message
  const reactionsByMsg = useMemo(() => {
    const map: Record<string, typeof reactions> = {};
    reactions.forEach((r) => {
      (map[r.message_id] ||= []).push(r);
    });
    return map;
  }, [reactions]);

  // Compute per-other-user latest read message for read-receipt avatars
  const readersByMsg = useMemo(() => {
    const out: Record<string, Array<{ profile_id: string; avatar_url?: string | null; name: string }>> = {};
    if (!profile?.id) return out;
    // Map profile -> sender info from messages for avatar lookup
    const profileMeta: Record<string, { avatar_url?: string | null; name: string }> = {};
    messages.forEach((m) => {
      if (m.sender_id && m.sender) {
        profileMeta[m.sender_id] = {
          avatar_url: m.sender.avatar_url,
          name: getPublicName(m.sender as any) || '?',
        };
      }
    });
    // For each other reader, find their latest-read OWN message id
    const ownMsgIds = new Set(messages.filter((m) => m.sender_id === profile.id).map((m) => m.id));
    const indexById: Record<string, number> = {};
    messages.forEach((m, i) => (indexById[m.id] = i));
    const latestByReader: Record<string, string> = {};
    reads.forEach((r) => {
      if (r.profile_id === profile.id) return;
      if (!ownMsgIds.has(r.message_id)) return;
      const cur = latestByReader[r.profile_id];
      if (!cur || (indexById[r.message_id] ?? -1) > (indexById[cur] ?? -1)) {
        latestByReader[r.profile_id] = r.message_id;
      }
    });
    Object.entries(latestByReader).forEach(([pid, mid]) => {
      const meta = profileMeta[pid] || { name: '?' };
      (out[mid] ||= []).push({ profile_id: pid, ...meta });
    });
    return out;
  }, [reads, messages, profile?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const typingNames = Object.values(typingUsers).map((t) => t.name);

  return (
    <div className="flex flex-col h-full">
      {contextBanner}

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="px-3 py-3 pb-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse mb-3" />
              <p className="text-sm text-muted-foreground">Start the conversation.</p>
            </div>
          ) : (
            items.map((it) => {
              if (it.kind === 'divider') {
                return <TimestampDivider key={it.key} at={it.at} />;
              }
              const m = it.message;
              const isOwn = m.sender_id === profile?.id;
              return (
                <MessageBubble
                  key={it.key}
                  message={m}
                  isOwn={isOwn}
                  isFirstInGroup={it.isFirstInGroup}
                  isLastInGroup={it.isLastInGroup}
                  isFresh={freshIds.has(m.id)}
                  reactions={reactionsByMsg[m.id] || []}
                  reads={reads.filter((r) => r.message_id === m.id)}
                  readers={readersByMsg[m.id] || []}
                  onToggleReaction={(emoji) => toggleReaction(m.id, emoji)}
                  onVisible={() => markRead(m.id)}
                  showSenderName={chatType !== 'dm'}
                />
              );
            })
          )}

          {typingNames.length > 0 && (
            <div className="mt-2">
              <TypingIndicator names={typingNames} />
            </div>
          )}
        </div>
      </ScrollArea>

      <ChatInputBar
        value={text}
        onChange={setText}
        onSend={handleSend}
        onTyping={broadcastTyping}
        onPickImage={handlePickImage}
        imagePreview={imagePreview}
        onClearImage={clearImage}
        sending={sendMessage.isPending || uploading}
      />
    </div>
  );
}
