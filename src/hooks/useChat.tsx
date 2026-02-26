import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  checkEventSquadChatEligibility, 
  linkSquadChatToEvent 
} from '@/hooks/useSquadChat';
import { sendRallyStartedMessage } from '@/hooks/useSystemMessages';

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  image_url?: string | null;
  message_type?: string | null;
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
  squad_id?: string | null;
  linked_event_id?: string | null;
  is_group: boolean;
  created_at: string;
  event?: {
    id: string;
    title: string;
  } | null;
  latest_message?: Message;
  unread_count?: number;
}

export function useEventChat(eventId: string) {
  const queryClient = useQueryClient();

  const { data: chat, isLoading: chatLoading } = useQuery({
    queryKey: ['event-chat', eventId],
    queryFn: async () => {
      // POL-2: Debug logging wrapped in dev check
      if (import.meta.env.DEV) console.log('[R@lly Debug] useEventChat fetching:', { event_id: eventId });

      // First check if a squad chat is already linked to this event
      const { data: linkedSquadChat } = await supabase
        .from('chats')
        .select('*')
        .eq('linked_event_id', eventId)
        .not('squad_id', 'is', null)
        .maybeSingle();

      if (linkedSquadChat) {
        if (import.meta.env.DEV) console.log('[R@lly Debug] Found linked squad chat:', { event_id: eventId, chat_id: linkedSquadChat.id });
        return linkedSquadChat;
      }

      // Check if there's an existing dedicated event chat
      const { data: existingEventChat } = await supabase
        .from('chats')
        .select('*')
        .eq('event_id', eventId)
        .is('squad_id', null)
        .maybeSingle();

      if (existingEventChat) {
        if (import.meta.env.DEV) console.log('[R@lly Debug] Found existing event chat:', { event_id: eventId, chat_id: existingEventChat.id });
        return existingEventChat;
      }

      // No existing chat - check if we should use a squad chat
      const eligibility = await checkEventSquadChatEligibility(eventId);

      if (eligibility.useSquadChat && eligibility.chatId) {
        // Link the squad chat to this event
        await linkSquadChatToEvent(eligibility.chatId, eventId);
        
        // Get the event title for the system message
        const { data: event } = await supabase
          .from('events')
          .select('title')
          .eq('id', eventId)
          .single();

        if (event) {
          await sendRallyStartedMessage(eligibility.chatId, event.title);
        }

        // Fetch the updated chat
        const { data: squadChat } = await supabase
          .from('chats')
          .select('*')
          .eq('id', eligibility.chatId)
          .single();

        if (import.meta.env.DEV) console.log('[R@lly Debug] Linked squad chat to event:', { event_id: eventId, chat_id: squadChat?.id });
        return squadChat;
      }

      // PHASE 8: Instead of lazily creating chat, log error and return null
      // Event chats should be created via database trigger at event creation
      if (import.meta.env.DEV) console.warn('[R@lly Debug] No chat found for event - chat should exist from event creation:', { event_id: eventId });
      
      // Still attempt creation as fallback, but log it as unexpected
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({ event_id: eventId, is_group: true })
        .select()
        .single();

      if (error) {
        if (import.meta.env.DEV) console.error('[R@lly Debug] Failed to create fallback chat:', { event_id: eventId, error: error.message });
        // Return null instead of throwing - component should handle null chat
        return null;
      }
      
      if (import.meta.env.DEV) console.log('[R@lly Debug] Created fallback chat (unexpected):', { event_id: eventId, chat_id: newChat?.id });
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
    // Helper to identify if this is a squad chat being used for the event
    isSquadChat: !!chat?.squad_id,
  };
}

export function useSendMessage() {
  const { profile } = useAuth();

  const activeProfile = profile;

  return useMutation({
    mutationFn: async ({ 
      chatId, 
      content, 
      imageUrl, 
      messageType = 'text' 
    }: { 
      chatId: string; 
      content: string; 
      imageUrl?: string;
      messageType?: string;
    }) => {
      if (!activeProfile?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: activeProfile.id,
          content: content.trim(),
          image_url: imageUrl || null,
          message_type: messageType,
        })
        .select()
        .single();

      if (error) throw error;

      // Send push notifications to other chat participants
      try {
        // Get all participants except the sender
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('profile_id')
          .eq('chat_id', chatId)
          .neq('profile_id', activeProfile.id);

        if (participants && participants.length > 0) {
          const recipientIds = participants.map(p => p.profile_id);
          const senderName = activeProfile.display_name || 'Someone';
          const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content;
          
          await supabase.functions.invoke('send-push-notification', {
            body: {
              driverProfileIds: recipientIds,
              title: `${senderName} sent a message`,
              body: messagePreview,
              tag: `chat-${chatId}`,
              data: { chatId, type: 'new_message' }
            }
          });
        }
      } catch (notifyError) {
        // Don't fail the message send if notifications fail
        console.error('Failed to send chat notification:', notifyError);
      }

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
        .select('*')
        .not('event_id', 'is', null);

      if (error) throw error;

      // Filter to only events user is attending
      const { data: attendances } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('profile_id', profile.id);

      const attendingEventIds = new Set(attendances?.map(a => a.event_id) || []);

      const userEventChats = (eventChats || []).filter(chat => 
        chat.event_id && attendingEventIds.has(chat.event_id)
      );
      
      // Fetch event details for each chat
      const chatsWithEvents = await Promise.all(userEventChats.map(async (chat) => {
        const { data: eventData } = await supabase
          .from('events')
          .select('id, title')
          .eq('id', chat.event_id!)
          .single();
        return { ...chat, event: eventData } as Chat;
      }));
      
      return chatsWithEvents;
    },
    enabled: !!profile?.id,
  });
}
