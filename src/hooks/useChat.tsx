import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface Chat {
  id: string;
  name: string | null;
  event_id: string | null;
  is_group: boolean;
  created_at: string;
  event?: {
    id: string;
    title: string;
  };
  latest_message?: Message;
  unread_count?: number;
}

export function useEventChat(eventId: string) {
  const queryClient = useQueryClient();

  const { data: chat, isLoading: chatLoading } = useQuery({
    queryKey: ['event-chat', eventId],
    queryFn: async () => {
      // Find or create chat for this event
      const { data: existingChat } = await supabase
        .from('chats')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (existingChat) return existingChat;

      // Create new chat for event
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({ event_id: eventId, is_group: true })
        .select()
        .single();

      if (error) throw error;
      return newChat;
    },
    enabled: !!eventId,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', chat?.id],
    queryFn: async () => {
      if (!chat?.id) return [];

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, display_name, avatar_url)
        `)
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!chat?.id,
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!chat?.id) return;

    const channel = supabase
      .channel(`chat-${chat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chat.id}`,
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(id, display_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            queryClient.setQueryData(['chat-messages', chat.id], (old: Message[] | undefined) => {
              if (!old) return [newMessage];
              // Avoid duplicates
              if (old.some(m => m.id === newMessage.id)) return old;
              return [...old, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chat?.id, queryClient]);

  return {
    chat,
    messages: messages || [],
    isLoading: chatLoading || messagesLoading,
  };
}

export function useSendMessage() {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ chatId, content }: { chatId: string; content: string }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: profile.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useUserChats() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['user-chats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Get chats where user is an attendee of the event
      const { data: eventChats, error } = await supabase
        .from('chats')
        .select(`
          *,
          event:events(id, title)
        `)
        .not('event_id', 'is', null);

      if (error) throw error;

      // Filter to only events user is attending
      const { data: attendances } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('profile_id', profile.id);

      const attendingEventIds = new Set(attendances?.map(a => a.event_id) || []);

      return (eventChats || []).filter(chat => 
        chat.event_id && attendingEventIds.has(chat.event_id)
      ) as Chat[];
    },
    enabled: !!profile?.id,
  });
}
