import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UnifiedChat } from '@/components/chat/unified/UnifiedChat';
import type { Message } from '@/hooks/useChat';
import { useMarkDmRead } from '@/hooks/useDirectMessages';

interface DirectMessageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string | null;
  otherProfile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function DirectMessageSheet({ open, onOpenChange, chatId, otherProfile }: DirectMessageSheetProps) {
  const queryClient = useQueryClient();
  const markRead = useMarkDmRead();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['dm-messages', chatId],
    queryFn: async () => {
      if (!chatId) return [] as Message[];
      const { data, error } = await supabase
        .from('messages')
        .select(`*, sender:profiles(id, display_name, avatar_url)`)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!chatId && open,
  });

  // Realtime: new DM messages
  useEffect(() => {
    if (!chatId || !open) return;
    const channel = supabase
      .channel(`dm-msg-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const { data: newMsg } = await supabase
            .from('messages')
            .select(`*, sender:profiles(id, display_name, avatar_url)`)
            .eq('id', (payload.new as any).id)
            .single();
          if (newMsg) {
            queryClient.setQueryData(['dm-messages', chatId], (old: Message[] | undefined) => {
              if (!old) return [newMsg as Message];
              if (old.some((m) => m.id === (newMsg as any).id)) return old;
              return [...old, newMsg as Message];
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, open, queryClient]);

  // Mark read on open + when new messages arrive
  useEffect(() => {
    if (open && chatId) {
      markRead.mutate(chatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chatId, messages.length]);

  const initial = otherProfile?.display_name?.charAt(0)?.toUpperCase() || '?';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] p-0 rounded-t-3xl backdrop-blur-xl bg-background/95 border-t border-border/40 flex flex-col"
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/40 shrink-0">
          <SheetTitle className="flex items-center gap-3 text-left">
            <Avatar className="h-10 w-10 ring-1 ring-primary/20">
              <AvatarImage src={otherProfile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/15 text-primary font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-base font-bold font-montserrat">
                {otherProfile?.display_name || 'R@lly Friend'}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">Direct message</span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0">
          {chatId && (
            <UnifiedChat
              chatId={chatId}
              chatType="dm"
              messages={messages}
              isLoading={isLoading}
              storagePath={`dm/${chatId}`}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
